package com.wenhe.dhustore.service;

import com.wenhe.dhustore.common.BusinessException;
import com.wenhe.dhustore.common.PageResult;
import com.wenhe.dhustore.common.ResultCode;
import com.wenhe.dhustore.dto.OrderCreateRequest;
import com.wenhe.dhustore.dto.OrderVO;
import com.wenhe.dhustore.entity.Address;
import com.wenhe.dhustore.entity.CartItem;
import com.wenhe.dhustore.entity.Order;
import com.wenhe.dhustore.entity.OrderItem;
import com.wenhe.dhustore.entity.Product;
import com.wenhe.dhustore.mapper.AddressMapper;
import com.wenhe.dhustore.mapper.CartItemMapper;
import com.wenhe.dhustore.mapper.OrderItemMapper;
import com.wenhe.dhustore.mapper.OrderMapper;
import com.wenhe.dhustore.mapper.ProductMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderService {

    private static final DateTimeFormatter ORDER_NO_FORMAT = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private final OrderMapper orderMapper;
    private final OrderItemMapper orderItemMapper;
    private final CartItemMapper cartItemMapper;
    private final ProductMapper productMapper;
    private final AddressMapper addressMapper;

    @Transactional
    public OrderVO create(Long userId, OrderCreateRequest req) {
        Address address = addressMapper.findByIdAndUserId(req.getAddressId(), userId);
        if (address == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }

        List<CartItem> checked = cartItemMapper.findByUserId(userId).stream()
                .filter(c -> c.getChecked() != null && c.getChecked() == 1)
                .collect(Collectors.toList());
        if (checked.isEmpty()) {
            throw new BusinessException(ResultCode.CART_EMPTY);
        }

        List<OrderItem> items = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        for (CartItem c : checked) {
            Product p = productMapper.findById(c.getProductId());
            if (p == null || (p.getStatus() != null && p.getStatus() == 0)) {
                throw new BusinessException(ResultCode.NOT_FOUND);
            }
            if (productMapper.deductStock(p.getId(), c.getQuantity()) == 0) {
                throw new BusinessException(ResultCode.STOCK_NOT_ENOUGH);
            }
            BigDecimal itemTotal = p.getPrice().multiply(BigDecimal.valueOf(c.getQuantity()));
            total = total.add(itemTotal);

            OrderItem oi = new OrderItem();
            oi.setProductId(p.getId());
            oi.setProductName(p.getName());
            oi.setProductImage(p.getMainImage());
            oi.setUnitPrice(p.getPrice());
            oi.setQuantity(c.getQuantity());
            oi.setTotalPrice(itemTotal);
            items.add(oi);
        }

        Order order = new Order();
        order.setOrderNo(generateOrderNo());
        order.setUserId(userId);
        order.setTotalPrice(total);
        order.setPayment(req.getPayment() == null ? 1 : req.getPayment());
        order.setStatus(0);
        order.setReceiverName(address.getReceiverName());
        order.setReceiverPhone(address.getReceiverPhone());
        order.setReceiverAddress(buildAddress(address));
        order.setRemark(req.getRemark());
        orderMapper.insert(order);

        for (OrderItem oi : items) {
            oi.setOrderId(order.getId());
        }
        orderItemMapper.batchInsert(items);

        cartItemMapper.deleteByIds(userId,
                checked.stream().map(CartItem::getId).collect(Collectors.toList()));

        order.setItems(items);
        return toVO(order);
    }

    public List<OrderVO> list(Long userId) {
        return orderMapper.findByUserId(userId).stream()
                .map(this::fillItems)
                .collect(Collectors.toList());
    }

    public OrderVO detail(Long userId, String orderNo) {
        return fillItems(getOwned(userId, orderNo));
    }

    @Transactional
    public void pay(Long userId, String orderNo) {
        Order order = getOwned(userId, orderNo);
        if (order.getStatus() != 0) {
            throw new BusinessException(ResultCode.ORDER_STATUS_ERROR);
        }
        orderMapper.updateStatus(order.getId(), 1);
    }

    @Transactional
    public void cancel(Long userId, String orderNo) {
        Order order = getOwned(userId, orderNo);
        if (order.getStatus() != 0) {
            throw new BusinessException(ResultCode.ORDER_STATUS_ERROR);
        }
        orderMapper.updateStatus(order.getId(), 4);
        for (OrderItem oi : orderItemMapper.findByOrderId(order.getId())) {
            productMapper.restoreStock(oi.getProductId(), oi.getQuantity());
        }
    }

    /** 确认收货：2 → 3 */
    @Transactional
    public void confirm(Long userId, String orderNo) {
        Order order = getOwned(userId, orderNo);
        if (order.getStatus() != 2) {
            throw new BusinessException(ResultCode.ORDER_STATUS_ERROR);
        }
        orderMapper.updateStatus(order.getId(), 3);
    }

    /** 发货：1 → 2（管理员） */
    @Transactional
    public void ship(String orderNo) {
        Order order = orderMapper.findByOrderNo(orderNo);
        if (order == null) {
            throw new BusinessException(ResultCode.ORDER_NOT_FOUND);
        }
        if (order.getStatus() != 1) {
            throw new BusinessException(ResultCode.ORDER_STATUS_ERROR);
        }
        orderMapper.updateStatus(order.getId(), 2);
    }

    /** 管理端订单列表（全部用户，可按状态筛选） */
    public PageResult<OrderVO> pageAllForAdmin(Integer status, int page, int size) {
        int offset = (page - 1) * size;
        List<Order> list = orderMapper.findAll(status, offset, size);
        long total = orderMapper.countAll(status);
        List<OrderVO> vos = list.stream().map(this::fillItems).collect(Collectors.toList());
        return new PageResult<>(vos, total, page, size);
    }

    /** 待发货订单数（status = 1），用于后台角标提示 */
    public long countPendingShipments() {
        return orderMapper.countAll(1);
    }

    /** 待处理订单摘要：待付款(status=0) 与 待发货(status=1) 数量 */
    public Map<String, Long> pendingSummary() {
        Map<String, Long> m = new LinkedHashMap<>();
        m.put("pendingPayment", orderMapper.countAll(0));
        m.put("pendingShipment", orderMapper.countAll(1));
        return m;
    }

    /** 用户侧待处理摘要：待付款(status=0) 与 待收货(status=2) 数量 */
    public Map<String, Long> userSummary(Long userId) {
        Map<String, Long> m = new LinkedHashMap<>();
        m.put("pendingPayment", orderMapper.countByUserIdAndStatus(userId, 0));
        m.put("pendingReceipt", orderMapper.countByUserIdAndStatus(userId, 2));
        return m;
    }

    private Order getOwned(Long userId, String orderNo) {
        Order order = orderMapper.findByOrderNo(orderNo);
        if (order == null || !order.getUserId().equals(userId)) {
            throw new BusinessException(ResultCode.ORDER_NOT_FOUND);
        }
        return order;
    }

    private OrderVO fillItems(Order order) {
        OrderVO vo = toVO(order);
        vo.setItems(orderItemMapper.findByOrderId(order.getId()));
        return vo;
    }

    private OrderVO toVO(Order order) {
        OrderVO vo = new OrderVO();
        vo.setId(order.getId());
        vo.setOrderNo(order.getOrderNo());
        vo.setTotalPrice(order.getTotalPrice());
        vo.setPayment(order.getPayment());
        vo.setStatus(order.getStatus());
        vo.setReceiverName(order.getReceiverName());
        vo.setReceiverPhone(order.getReceiverPhone());
        vo.setReceiverAddress(order.getReceiverAddress());
        vo.setRemark(order.getRemark());
        vo.setPaymentTime(order.getPaymentTime());
        vo.setCreateTime(order.getCreateTime());
        vo.setItems(order.getItems());
        return vo;
    }

    private String generateOrderNo() {
        return ORDER_NO_FORMAT.format(LocalDateTime.now())
                + String.format("%04d", ThreadLocalRandom.current().nextInt(10000));
    }

    private String buildAddress(Address a) {
        StringBuilder sb = new StringBuilder();
        if (a.getProvince() != null) sb.append(a.getProvince());
        if (a.getCity() != null) sb.append(a.getCity());
        if (a.getDistrict() != null) sb.append(a.getDistrict());
        sb.append(a.getDetail());
        return sb.toString();
    }
}
