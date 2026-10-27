package com.wenhe.dhustore.service;

import com.wenhe.dhustore.common.BusinessException;
import com.wenhe.dhustore.common.OrderStatus;
import com.wenhe.dhustore.common.PageResult;
import com.wenhe.dhustore.common.Paging;
import com.wenhe.dhustore.common.ResultCode;
import com.wenhe.dhustore.dto.CouponVO;
import com.wenhe.dhustore.dto.OrderCreateRequest;
import com.wenhe.dhustore.dto.OrderPreviewVO;
import com.wenhe.dhustore.dto.OrderVO;
import com.wenhe.dhustore.dto.PriceBreakdown;
import com.wenhe.dhustore.entity.Address;
import com.wenhe.dhustore.entity.CartItem;
import com.wenhe.dhustore.entity.Coupon;
import com.wenhe.dhustore.entity.Order;
import com.wenhe.dhustore.entity.OrderItem;
import com.wenhe.dhustore.entity.Product;
import com.wenhe.dhustore.mapper.AddressMapper;
import com.wenhe.dhustore.mapper.CartItemMapper;
import com.wenhe.dhustore.mapper.OrderItemMapper;
import com.wenhe.dhustore.mapper.OrderMapper;
import com.wenhe.dhustore.mapper.OrderSubmitTokenMapper;
import com.wenhe.dhustore.mapper.PaymentMapper;
import com.wenhe.dhustore.mapper.ProductMapper;
import com.wenhe.dhustore.mapper.UserCouponMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

/**
 * 订单：试算 / 下单 / 状态流转。
 *
 * 三条一致性约定：
 * 1. 金额只由 {@link PricingService} 计算，试算与下单共用同一入口；
 * 2. 状态流转一律走 OrderMapper.transit，WHERE 带旧状态，并发下只有一方成功；
 * 3. 下单用 submitToken 幂等，同一令牌只会产生一笔订单。
 */
@Service
@RequiredArgsConstructor
public class OrderService {

    private static final DateTimeFormatter ORDER_NO_FORMAT = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    /** 单笔订单最多商品种类 */
    private static final int MAX_ITEMS = 50;
    /** 单件商品最大购买数量 */
    private static final int MAX_QUANTITY = 999;

    private final OrderMapper orderMapper;
    private final OrderItemMapper orderItemMapper;
    private final CartItemMapper cartItemMapper;
    private final ProductMapper productMapper;
    private final AddressMapper addressMapper;
    private final PaymentMapper paymentMapper;
    private final UserCouponMapper userCouponMapper;
    private final OrderSubmitTokenMapper orderSubmitTokenMapper;
    private final CouponService couponService;
    private final PricingService pricingService;

    /** 支付超时分钟数 */
    @Value("${shop.order.pay-timeout-minutes:30}")
    private int payTimeoutMinutes;

    /* ------------------------------------------------------------ 试算 */

    /**
     * 结算页试算：购物车勾选项 + 券 → 价格明细。
     * 与 create 共用 PricingService，保证展示价与实付价完全一致。
     */
    public OrderPreviewVO preview(Long userId, Long userCouponId) {
        return preview(userId, userCouponId, null, null);
    }

    /**
     * @param buyNowProductId 非空表示「立即购买」：只结算该商品，与购物车勾选状态无关
     * @param buyNowQuantity  立即购买数量，缺省 1
     */
    public OrderPreviewVO preview(Long userId, Long userCouponId,
                                  Long buyNowProductId, Integer buyNowQuantity) {
        List<Line> lines = resolveLines(userId, buyNowProductId, buyNowQuantity);

        OrderPreviewVO vo = new OrderPreviewVO();
        vo.setPayTimeoutMinutes(payTimeoutMinutes);
        vo.setFreeThreshold(pricingService.freeThreshold());
        List<OrderPreviewVO.PreviewItem> items = new ArrayList<>();
        Map<Long, BigDecimal> categoryAmounts = new HashMap<>();
        BigDecimal goodsAmount = BigDecimal.ZERO;
        boolean purchasable = true;
        String errorTip = null;

        for (Line line : lines) {
            Product p = productMapper.findById(line.productId);
            OrderPreviewVO.PreviewItem item = new OrderPreviewVO.PreviewItem();
            item.setCartItemId(line.cartItemId);
            item.setProductId(line.productId);
            item.setQuantity(line.quantity);
            if (p == null) {
                item.setProductName("商品已下架");
                item.setAvailable(false);
                purchasable = false;
                errorTip = "有商品已下架，请返回购物车移除后再结算";
                items.add(item);
                continue;
            }
            int qty = line.quantity;
            BigDecimal subtotal = p.getPrice().multiply(BigDecimal.valueOf(qty)).setScale(2, RoundingMode.HALF_UP);
            item.setProductName(p.getName());
            item.setProductImage(p.getMainImage());
            item.setCategoryId(p.getCategoryId());
            item.setPrice(p.getPrice());
            item.setStock(p.getStock());
            item.setSubtotal(subtotal);
            boolean onSale = p.getStatus() != null && p.getStatus() == 1;
            boolean enough = p.getStock() != null && p.getStock() >= qty;
            item.setAvailable(onSale && enough);
            if (!onSale) {
                purchasable = false;
                errorTip = "「" + p.getName() + "」已下架";
            } else if (!enough) {
                purchasable = false;
                errorTip = "「" + p.getName() + "」库存不足，仅剩 " + p.getStock() + " 件";
            }
            if (onSale && enough) {
                goodsAmount = goodsAmount.add(subtotal);
                categoryAmounts.merge(p.getCategoryId(), subtotal, BigDecimal::add);
            }
            items.add(item);
        }

        Coupon coupon = null;
        if (userCouponId != null) {
            try {
                coupon = couponService.resolveForOrder(userId, userCouponId, goodsAmount, categoryAmounts);
            } catch (BusinessException e) {
                /* 试算阶段券失效不报错，退回无券价格 */
                coupon = null;
            }
        }
        BigDecimal scopeAmount = coupon == null ? goodsAmount
                : couponService.scopeAmount(coupon.getScope(), coupon.getCategoryId(), goodsAmount, categoryAmounts);
        PriceBreakdown price = pricingService.breakdown(goodsAmount, scopeAmount, coupon);
        if (coupon != null && price.getDiscount().compareTo(BigDecimal.ZERO) > 0) {
            /* 前端用它回显「已选哪张券」，必须是用户券 id */
            price.setCouponId(userCouponId);
        }

        List<CouponVO> coupons = couponService.mineForOrder(userId, goodsAmount, categoryAmounts);
        vo.setItems(items);
        vo.setPrice(price);
        vo.setCoupons(coupons);
        vo.setPurchasable(purchasable);
        vo.setErrorTip(errorTip);
        /* 失效商品已从结算范围剔除，这里告知用户被排除的件数，避免「勾了却没结算」的困惑 */
        if (buyNowProductId == null) {
            int excluded = cartItemMapper.countInvalidChecked(userId);
            if (excluded > 0) {
                vo.setNotice(excluded + " 件商品已失效，未参与本次结算");
            }
        }
        return vo;
    }

    /* ------------------------------------------------------------ 下单 */

    @Transactional
    public OrderVO create(Long userId, OrderCreateRequest req) {
        String token = req.getSubmitToken();
        if (token != null && !token.isBlank()) {
            String usedOrderNo = orderSubmitTokenMapper.findOrderNo(token, userId);
            if (usedOrderNo != null) {
                /* 同一令牌已生成过订单：直接返回该订单，前端视为成功 */
                Order existed = orderMapper.findByOrderNo(usedOrderNo);
                if (existed != null) {
                    return fillItems(existed);
                }
            }
        }

        Address address = addressMapper.findByIdAndUserId(req.getAddressId(), userId);
        if (address == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }

        List<Line> lines = resolveLines(userId, req.getBuyNowProductId(), req.getBuyNowQuantity());
        if (lines.isEmpty()) {
            throw new BusinessException(ResultCode.CART_EMPTY);
        }
        if (lines.size() > MAX_ITEMS) {
            throw new BusinessException(ResultCode.BAD_REQUEST.getCode(), "单笔订单商品种类不能超过 " + MAX_ITEMS);
        }

        /* 先扣库存并快照，任一失败抛异常回滚整笔订单 */
        List<OrderItem> items = new ArrayList<>();
        Map<Long, BigDecimal> categoryAmounts = new HashMap<>();
        BigDecimal goodsAmount = BigDecimal.ZERO;
        for (Line line : lines) {
            int qty = line.quantity;
            if (qty <= 0 || qty > MAX_QUANTITY) {
                throw new BusinessException(ResultCode.BAD_REQUEST.getCode(), "购买数量不合法");
            }
            Product p = productMapper.findById(line.productId);
            if (p == null || p.getStatus() == null || p.getStatus() == 0) {
                throw new BusinessException(ResultCode.NOT_FOUND.getCode(), "有商品已下架，请返回购物车调整");
            }
            /* 条件更新扣库存：并发下超卖会被挡在数据库层 */
            if (productMapper.deductStock(p.getId(), qty) == 0) {
                throw new BusinessException(ResultCode.STOCK_NOT_ENOUGH.getCode(),
                        "「" + p.getName() + "」库存不足，仅剩 " + p.getStock() + " 件");
            }
            BigDecimal subtotal = p.getPrice().multiply(BigDecimal.valueOf(qty)).setScale(2, RoundingMode.HALF_UP);
            goodsAmount = goodsAmount.add(subtotal);
            categoryAmounts.merge(p.getCategoryId(), subtotal, BigDecimal::add);

            OrderItem oi = new OrderItem();
            oi.setProductId(p.getId());
            oi.setProductName(p.getName());
            oi.setProductImage(p.getMainImage());
            oi.setUnitPrice(p.getPrice());
            oi.setQuantity(qty);
            oi.setTotalPrice(subtotal);
            oi.setRefundStatus(0);
            items.add(oi);
        }

        Coupon coupon = null;
        if (req.getCouponId() != null) {
            coupon = couponService.resolveForOrder(userId, req.getCouponId(), goodsAmount, categoryAmounts);
        }
        BigDecimal scopeAmount = coupon == null ? goodsAmount
                : couponService.scopeAmount(coupon.getScope(), coupon.getCategoryId(), goodsAmount, categoryAmounts);
        PriceBreakdown price = pricingService.breakdown(goodsAmount, scopeAmount, coupon);
        if (coupon != null && price.getDiscount().compareTo(BigDecimal.ZERO) > 0) {
            price.setCouponId(req.getCouponId());
        }

        int payment = req.getPayment() == null ? 1 : req.getPayment();

        Order order = new Order();
        order.setOrderNo(generateOrderNo());
        order.setUserId(userId);
        order.setTotalPrice(price.getPayAmount());
        order.setGoodsAmount(price.getGoodsAmount());
        order.setFreight(price.getFreight());
        order.setDiscount(price.getDiscount());
        order.setPayAmount(price.getPayAmount());
        order.setCouponId(req.getCouponId());
        order.setPayment(payment);
        order.setReceiverName(address.getReceiverName());
        order.setReceiverPhone(address.getReceiverPhone());
        order.setReceiverAddress(buildAddress(address));
        order.setRemark(req.getRemark());
        order.setExpireAt(LocalDateTime.now().plusMinutes(payTimeoutMinutes));
        /* 货到付款无需线上支付，直接进入待发货 */
        order.setStatus(payment == 2 ? OrderStatus.PAID : OrderStatus.PENDING_PAY);
        orderMapper.insert(order);

        for (OrderItem oi : items) {
            oi.setOrderId(order.getId());
        }
        orderItemMapper.batchInsert(items);

        /* 占用券：条件更新失败说明券被别处用掉，整笔回滚 */
        if (req.getCouponId() != null && price.getDiscount().compareTo(BigDecimal.ZERO) > 0) {
            if (userCouponMapper.markUsed(req.getCouponId(), userId, order.getOrderNo()) == 0) {
                throw new BusinessException(ResultCode.COUPON_INVALID);
            }
        }

        /* 只清理来自购物车的行；直购商品未进入购物车，不能误删 */
        List<Long> cartIds = lines.stream().map(l -> l.cartItemId)
                .filter(Objects::nonNull).collect(Collectors.toList());
        if (!cartIds.isEmpty()) {
            cartItemMapper.deleteByIds(userId, cartIds);
        }

        if (token != null && !token.isBlank()) {
            /* 令牌被并发请求抢先消费：本笔回滚，提示重复提交 */
            if (orderSubmitTokenMapper.consume(token, userId, order.getOrderNo()) == 0) {
                throw new BusinessException(ResultCode.ORDER_SUBMIT_DUPLICATE);
            }
        }

        order.setItems(items);
        return toVO(order);
    }

    /** 生成一次性下单令牌（进入结算页时调用） */
    public String newSubmitToken(Long userId) {
        String token = UUID.randomUUID().toString().replace("-", "");
        orderSubmitTokenMapper.insert(token, userId);
        return token;
    }

    /* ------------------------------------------------------------ 查询 */

    public PageResult<OrderVO> page(Long userId, List<Integer> statuses, int page, int size) {
        int safePage = Paging.page(page);
        int safeSize = Paging.size(size);
        List<Order> rows = orderMapper.pageByUser(userId, statuses,
                Paging.offset(safePage, safeSize), safeSize);
        long total = orderMapper.countByUser(userId, statuses);
        return new PageResult<>(assemble(rows), total, safePage, safeSize);
    }

    public OrderVO detail(Long userId, String orderNo) {
        return fillItems(getOwned(userId, orderNo));
    }

    /* ------------------------------------------------------------ 状态流转 */

    /** 用户取消：仅待付款可取消，成功后回补库存、退回券、关闭支付单 */
    @Transactional
    public void cancel(Long userId, String orderNo, String reason) {
        getOwned(userId, orderNo);
        String why = reason == null || reason.isBlank() ? "用户主动取消" : reason;
        if (orderMapper.transit(orderNo, OrderStatus.PENDING_PAY, OrderStatus.CANCELED,
                null, null, null, why) == 0) {
            throw new BusinessException(ResultCode.ORDER_STATUS_ERROR);
        }
        releaseResources(orderNo);
    }

    /** 管理员发货：1 → 2 */
    @Transactional
    public void ship(String orderNo) {
        Order order = orderMapper.findByOrderNo(orderNo);
        if (order == null) {
            throw new BusinessException(ResultCode.ORDER_NOT_FOUND);
        }
        if (orderMapper.transit(orderNo, OrderStatus.PAID, OrderStatus.SHIPPED,
                null, LocalDateTime.now(), null, null) == 0) {
            throw new BusinessException(ResultCode.ORDER_STATUS_ERROR);
        }
    }

    /** 确认收货：2 → 3 */
    @Transactional
    public void confirm(Long userId, String orderNo) {
        getOwned(userId, orderNo);
        if (orderMapper.transit(orderNo, OrderStatus.SHIPPED, OrderStatus.FINISHED,
                null, null, LocalDateTime.now(), null) == 0) {
            throw new BusinessException(ResultCode.ORDER_STATUS_ERROR);
        }
    }

    /**
     * 支付成功后推进订单状态（供 PaymentService 调用）。幂等：已是待发货直接返回 true。
     */
    @Transactional
    public boolean markPaid(String orderNo, LocalDateTime paidTime) {
        Order order = orderMapper.findByOrderNo(orderNo);
        if (order == null) {
            return false;
        }
        if (order.getStatus() == OrderStatus.PAID) {
            return true;
        }
        return orderMapper.transit(orderNo, OrderStatus.PENDING_PAY, OrderStatus.PAID,
                paidTime, null, null, null) > 0;
    }

    /** 订单转入退款中（售后退款需要占用订单状态） */
    @Transactional
    public void markRefunding(String orderNo) {
        Order order = orderMapper.findByOrderNo(orderNo);
        if (order == null) {
            throw new BusinessException(ResultCode.ORDER_NOT_FOUND);
        }
        int from = order.getStatus() == null ? OrderStatus.PAID : order.getStatus();
        if (orderMapper.transit(orderNo, from, OrderStatus.REFUNDING, null, null, null, null) == 0) {
            throw new BusinessException(ResultCode.ORDER_STATUS_ERROR);
        }
    }

    /** 退款完成：转入终态并回补库存 */
    @Transactional
    public void markRefunded(String orderNo) {
        Order order = orderMapper.findByOrderNo(orderNo);
        if (order == null) {
            throw new BusinessException(ResultCode.ORDER_NOT_FOUND);
        }
        if (order.getStatus() != OrderStatus.REFUNDING) {
            throw new BusinessException(ResultCode.ORDER_STATUS_ERROR);
        }
        if (orderMapper.transit(orderNo, OrderStatus.REFUNDING, OrderStatus.REFUNDED,
                null, null, LocalDateTime.now(), "退款完成") == 0) {
            throw new BusinessException(ResultCode.ORDER_STATUS_ERROR);
        }
        restoreStock(order);
    }

    /** 售后被拒绝：退回原状态 */
    @Transactional
    public void rollbackRefunding(String orderNo, int backTo) {
        orderMapper.transit(orderNo, OrderStatus.REFUNDING, backTo, null, null, null, null);
    }

    /* ------------------------------------------------------------ 定时任务用 */

    /** 超时未支付：关闭订单并释放库存与券 */
    @Transactional
    public int closeExpiredOrders(int limit) {
        List<Order> expired = orderMapper.findExpired(LocalDateTime.now(), limit);
        int closed = 0;
        for (Order o : expired) {
            if (orderMapper.transit(o.getOrderNo(), OrderStatus.PENDING_PAY, OrderStatus.CLOSED,
                    null, null, null, "超时未支付，系统自动关闭") > 0) {
                releaseResources(o.getOrderNo());
                closed++;
            }
        }
        return closed;
    }

    /** 发货后 N 天未确认收货：自动完成 */
    @Transactional
    public int autoConfirmShipped(int days, int limit) {
        List<Order> list = orderMapper.findShippedBefore(LocalDateTime.now().minusDays(days), limit);
        int done = 0;
        for (Order o : list) {
            if (orderMapper.transit(o.getOrderNo(), OrderStatus.SHIPPED, OrderStatus.FINISHED,
                    null, null, LocalDateTime.now(), null) > 0) {
                done++;
            }
        }
        return done;
    }

    /* ------------------------------------------------------------ 统计（后台） */

    public PageResult<OrderVO> pageAllForAdmin(Integer status, int page, int size) {
        int safePage = Paging.page(page);
        int safeSize = Paging.size(size);
        List<Order> rows = orderMapper.findAll(status, Paging.offset(safePage, safeSize), safeSize);
        long total = orderMapper.countAll(status);
        return new PageResult<>(assemble(rows), total, safePage, safeSize);
    }

    public long countPendingShipments() {
        return orderMapper.countAll(OrderStatus.PAID);
    }

    public Map<String, Long> pendingSummary() {
        Map<String, Long> m = new LinkedHashMap<>();
        m.put("pendingPayment", orderMapper.countAll(OrderStatus.PENDING_PAY));
        m.put("pendingShipment", orderMapper.countAll(OrderStatus.PAID));
        m.put("refunding", orderMapper.countAll(OrderStatus.REFUNDING));
        return m;
    }

    public Map<String, Long> userSummary(Long userId) {
        Map<String, Long> m = new LinkedHashMap<>();
        m.put("pendingPayment", orderMapper.countByUserIdAndStatus(userId, OrderStatus.PENDING_PAY));
        m.put("pendingReceipt", orderMapper.countByUserIdAndStatus(userId, OrderStatus.SHIPPED));
        m.put("refunding", orderMapper.countByUserIdAndStatus(userId, OrderStatus.REFUNDING));
        return m;
    }

    /* ------------------------------------------------------------ 内部 */

    /** 释放订单占用的库存、优惠券与待支付单 */
    private void releaseResources(String orderNo) {
        Order order = orderMapper.findByOrderNo(orderNo);
        if (order == null) {
            return;
        }
        restoreStock(order);
        userCouponMapper.release(orderNo, order.getUserId());
        paymentMapper.closeByOrderNo(orderNo);
    }

    private void restoreStock(Order order) {
        List<OrderItem> items = orderItemMapper.findByOrderId(order.getId());
        for (OrderItem oi : items) {
            productMapper.restoreStock(oi.getProductId(), oi.getQuantity());
        }
    }

    /**
     * 待结算的购物车行：勾选且在售有货。
     * 失效行不入单，避免「加入购物车后商品下架」把整笔订单卡住。
     */
    private List<CartItem> checkedCart(Long userId) {
        return cartItemMapper.findCheckedAvailableByUserId(userId);
    }

    /**
     * 统一的待下单明细：来自购物车勾选时 cartItemId 非空，来自「立即购买」时为空。
     * 两种来源后续共用同一套算价、扣库存与快照逻辑，避免两套实现产生口径差异。
     */
    private static final class Line {
        final Long cartItemId;
        final Long productId;
        final int quantity;

        Line(Long cartItemId, Long productId, int quantity) {
            this.cartItemId = cartItemId;
            this.productId = productId;
            this.quantity = quantity;
        }
    }

    private List<Line> resolveLines(Long userId, Long buyNowProductId, Integer buyNowQuantity) {
        if (buyNowProductId != null) {
            int qty = buyNowQuantity == null ? 1 : buyNowQuantity;
            if (qty <= 0 || qty > MAX_QUANTITY) {
                throw new BusinessException(ResultCode.BAD_REQUEST.getCode(), "购买数量不合法");
            }
            return List.of(new Line(null, buyNowProductId, qty));
        }
        List<Line> lines = new ArrayList<>();
        for (CartItem c : checkedCart(userId)) {
            lines.add(new Line(c.getId(), c.getProductId(),
                    c.getQuantity() == null ? 1 : c.getQuantity()));
        }
        return lines;
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

    /**
     * 批量装配订单明细：一次查询取回本页所有订单的商品行，再按订单分组。
     * 逐单查询会形成 N+1（每页 10 单 = 11 次 SQL），此处在列表场景统一走批量。
     */
    private List<OrderVO> assemble(List<Order> orders) {
        if (orders == null || orders.isEmpty()) {
            return new ArrayList<>();
        }
        List<Long> ids = orders.stream().map(Order::getId).collect(Collectors.toList());
        Map<Long, List<OrderItem>> grouped = orderItemMapper.findByOrderIds(ids).stream()
                .collect(Collectors.groupingBy(OrderItem::getOrderId));
        List<OrderVO> vos = new ArrayList<>(orders.size());
        for (Order o : orders) {
            OrderVO vo = toVO(o);
            vo.setItems(grouped.getOrDefault(o.getId(), List.of()));
            vos.add(vo);
        }
        return vos;
    }

    public OrderVO toVO(Order order) {
        OrderVO vo = new OrderVO();
        vo.setId(order.getId());
        vo.setOrderNo(order.getOrderNo());
        vo.setTotalPrice(order.getPayAmount() != null ? order.getPayAmount() : order.getTotalPrice());
        vo.setGoodsAmount(order.getGoodsAmount());
        vo.setFreight(order.getFreight());
        vo.setDiscount(order.getDiscount());
        vo.setPayAmount(order.getPayAmount());
        vo.setCouponId(order.getCouponId());
        vo.setPayment(order.getPayment());
        vo.setStatus(order.getStatus());
        vo.setStatusText(OrderStatus.label(order.getStatus()));
        vo.setReceiverName(order.getReceiverName());
        vo.setReceiverPhone(order.getReceiverPhone());
        vo.setReceiverAddress(order.getReceiverAddress());
        vo.setRemark(order.getRemark());
        vo.setPaymentTime(order.getPaymentTime());
        vo.setExpireAt(order.getExpireAt());
        vo.setShipTime(order.getShipTime());
        vo.setFinishTime(order.getFinishTime());
        vo.setCancelReason(order.getCancelReason());
        vo.setCreateTime(order.getCreateTime());
        vo.setRefunding(order.getStatus() != null && order.getStatus() == OrderStatus.REFUNDING);
        vo.setItems(order.getItems());
        return vo;
    }

    private String generateOrderNo() {
        return ORDER_NO_FORMAT.format(LocalDateTime.now())
                + String.format("%04d", ThreadLocalRandom.current().nextInt(10000));
    }

    private String buildAddress(Address a) {
        StringBuilder sb = new StringBuilder();
        if (a.getProvince() != null) {
            sb.append(a.getProvince());
        }
        if (a.getCity() != null) {
            sb.append(a.getCity());
        }
        if (a.getDistrict() != null) {
            sb.append(a.getDistrict());
        }
        sb.append(a.getDetail());
        return sb.toString();
    }
}
