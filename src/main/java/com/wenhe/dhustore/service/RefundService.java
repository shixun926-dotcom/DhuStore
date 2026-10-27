package com.wenhe.dhustore.service;

import com.wenhe.dhustore.common.BusinessException;
import com.wenhe.dhustore.common.OrderStatus;
import com.wenhe.dhustore.common.ResultCode;
import com.wenhe.dhustore.dto.RefundCreateRequest;
import com.wenhe.dhustore.entity.Order;
import com.wenhe.dhustore.entity.RefundRequest;
import com.wenhe.dhustore.mapper.OrderMapper;
import com.wenhe.dhustore.mapper.RefundRequestMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

/**
 * 售后：用户申请 → 管理员审核 → 同意则订单转「退款完成」并回补库存，拒绝则退回原状态。
 *
 * 原状态不额外存储：由订单的发货/完成时间戳推导，
 * 这样退款中（status=6）不会丢失「退款前处于哪个阶段」的信息。
 */
@Service
@RequiredArgsConstructor
public class RefundService {

    private static final DateTimeFormatter NO_FORMAT = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private final RefundRequestMapper refundRequestMapper;
    private final OrderMapper orderMapper;
    private final OrderService orderService;

    /** 用户申请售后 */
    @Transactional
    public RefundRequest apply(Long userId, String orderNo, RefundCreateRequest req) {
        Order order = orderMapper.findByOrderNo(orderNo);
        if (order == null || !order.getUserId().equals(userId)) {
            throw new BusinessException(ResultCode.ORDER_NOT_FOUND);
        }
        int status = order.getStatus() == null ? -1 : order.getStatus();
        if (status != OrderStatus.PAID && status != OrderStatus.SHIPPED && status != OrderStatus.FINISHED) {
            throw new BusinessException(ResultCode.REFUND_NOT_ALLOWED);
        }
        if (refundRequestMapper.findProcessingByOrderNo(orderNo) != null) {
            throw new BusinessException(ResultCode.REFUND_EXISTS);
        }
        BigDecimal pay = order.getPayAmount() == null ? order.getTotalPrice() : order.getPayAmount();
        if (req.getAmount().compareTo(pay) > 0) {
            throw new BusinessException(ResultCode.BAD_REQUEST.getCode(),
                    "退款金额不能超过实付金额 ¥" + pay);
        }

        RefundRequest r = new RefundRequest();
        r.setRefundNo("R" + NO_FORMAT.format(LocalDateTime.now())
                + String.format("%04d", ThreadLocalRandom.current().nextInt(10000)));
        r.setOrderNo(orderNo);
        r.setUserId(userId);
        r.setType(req.getType());
        r.setAmount(req.getAmount());
        r.setReason(req.getReason());
        r.setImages(req.getImages() == null ? null : String.join(",", req.getImages()));
        r.setStatus(RefundRequest.PENDING);
        refundRequestMapper.insert(r);

        /* 冻结订单：转入退款中，避免退款期间继续发货或确认收货 */
        orderService.markRefunding(orderNo);
        return r;
    }

    /** 管理员审核：agree=true 退款完成，false 拒绝并回退原状态 */
    @Transactional
    public void audit(String refundNo, boolean agree, String remark) {
        RefundRequest r = refundRequestMapper.findByRefundNo(refundNo);
        if (r == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        if (r.getStatus() != RefundRequest.PENDING) {
            throw new BusinessException(ResultCode.REFUND_EXISTS);
        }
        Order order = orderMapper.findByOrderNo(r.getOrderNo());
        if (order == null) {
            throw new BusinessException(ResultCode.ORDER_NOT_FOUND);
        }
        int backTo = previousStatus(order);

        if (refundRequestMapper.audit(refundNo,
                agree ? RefundRequest.REFUNDED : RefundRequest.REJECTED, remark) == 0) {
            throw new BusinessException(ResultCode.REFUND_EXISTS);
        }
        if (agree) {
            orderService.markRefunded(r.getOrderNo());
        } else {
            orderService.rollbackRefunding(r.getOrderNo(), backTo);
        }
    }

    public List<RefundRequest> myList(Long userId) {
        return refundRequestMapper.findByUserId(userId);
    }

    public List<RefundRequest> adminList(Integer status) {
        return refundRequestMapper.findAll(status);
    }

    public RefundRequest detail(String refundNo) {
        RefundRequest r = refundRequestMapper.findByRefundNo(refundNo);
        if (r == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        return r;
    }

    /** 由时间戳推导退款前的订单状态 */
    private int previousStatus(Order order) {
        if (order.getShipTime() == null) {
            return OrderStatus.PAID;
        }
        return order.getFinishTime() == null ? OrderStatus.SHIPPED : OrderStatus.FINISHED;
    }
}
