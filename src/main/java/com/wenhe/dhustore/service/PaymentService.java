package com.wenhe.dhustore.service;

import com.wenhe.dhustore.common.BusinessException;
import com.wenhe.dhustore.common.OrderStatus;
import com.wenhe.dhustore.common.ResultCode;
import com.wenhe.dhustore.dto.PaymentVO;
import com.wenhe.dhustore.entity.Order;
import com.wenhe.dhustore.entity.Payment;
import com.wenhe.dhustore.mapper.OrderMapper;
import com.wenhe.dhustore.mapper.PaymentMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

/**
 * 支付：创建支付单 → 跳转收银台 → 网关回调推进订单状态。
 *
 * 当前用本地模拟网关：{@link #mockCallback} 扮演三方回调，
 * 真实接入时把该方法替换为验签后的回调入口即可，订单侧逻辑无需改动。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private static final DateTimeFormatter NO_FORMAT = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private final PaymentMapper paymentMapper;
    private final OrderMapper orderMapper;
    private final OrderService orderService;

    /** 创建（或复用）支付单 */
    @Transactional
    public PaymentVO create(Long userId, String orderNo, Integer channel) {
        Order order = orderMapper.findByOrderNo(orderNo);
        if (order == null || !order.getUserId().equals(userId)) {
            throw new BusinessException(ResultCode.ORDER_NOT_FOUND);
        }
        if (order.getStatus() == OrderStatus.PAID) {
            throw new BusinessException(ResultCode.PAYMENT_DUPLICATE);
        }
        if (order.getStatus() != OrderStatus.PENDING_PAY) {
            throw new BusinessException(ResultCode.ORDER_STATUS_ERROR);
        }
        if (order.getExpireAt() != null && order.getExpireAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException(ResultCode.ORDER_EXPIRED);
        }

        int ch = channel == null ? Payment.CHANNEL_ALIPAY : channel;
        Payment latest = paymentMapper.findLatestByOrderNo(orderNo);
        /* 同一订单重复打开收银台：复用未关闭的支付单，避免产生多条待支付记录 */
        if (latest != null && latest.getStatus() == Payment.WAITING && latest.getChannel().equals(ch)) {
            return toVO(latest, order);
        }
        if (latest != null && latest.getStatus() == Payment.WAITING) {
            paymentMapper.markClosed(latest.getPaymentNo());
        }

        Payment payment = new Payment();
        payment.setPaymentNo(newPaymentNo());
        payment.setOrderNo(orderNo);
        payment.setUserId(userId);
        payment.setChannel(ch);
        payment.setAmount(order.getPayAmount());
        payment.setStatus(Payment.WAITING);
        paymentMapper.insert(payment);

        return toVO(payment, order);
    }

    /**
     * 模拟支付网关回调。真实场景由三方异步通知触发，这里由收银台按钮调用。
     * 幂等：同一支付单重复回调只生效一次。
     */
    @Transactional
    public PaymentVO mockCallback(String paymentNo) {
        Payment payment = paymentMapper.findByPaymentNo(paymentNo);
        if (payment == null) {
            throw new BusinessException(ResultCode.PAYMENT_NOT_FOUND);
        }
        if (payment.getStatus() == Payment.SUCCESS) {
            return toVO(payment, orderMapper.findByOrderNo(payment.getOrderNo()));
        }
        if (payment.getStatus() == Payment.CLOSED) {
            throw new BusinessException(ResultCode.PAYMENT_CLOSED);
        }

        String callbackNo = "MOCK" + UUID.randomUUID().toString().replace("-", "").substring(0, 20);
        LocalDateTime now = LocalDateTime.now();
        if (paymentMapper.markSuccess(paymentNo, callbackNo, now) == 0) {
            /* 并发重复回调：另一条已处理，按成功返回 */
            Payment latest = paymentMapper.findByPaymentNo(paymentNo);
            return toVO(latest, orderMapper.findByOrderNo(latest.getOrderNo()));
        }

        boolean paid = orderService.markPaid(payment.getOrderNo(), now);
        if (!paid) {
            /* 订单已不在待付款（多为超时关单）：整笔回滚，避免钱到了单子却已关闭 */
            throw new BusinessException(ResultCode.PAYMENT_CLOSED);
        }
        log.info("模拟支付成功 paymentNo={} orderNo={}", paymentNo, payment.getOrderNo());
        return toVO(paymentMapper.findByPaymentNo(paymentNo), orderMapper.findByOrderNo(payment.getOrderNo()));
    }

    /** 查询支付单（收银台轮询用），校验归属 */
    public PaymentVO query(String paymentNo, Long userId) {
        Payment payment = paymentMapper.findByPaymentNo(paymentNo);
        if (payment == null || !payment.getUserId().equals(userId)) {
            throw new BusinessException(ResultCode.PAYMENT_NOT_FOUND);
        }
        return toVO(payment, orderMapper.findByOrderNo(payment.getOrderNo()));
    }

    /** 用户取消 / 系统关单时关闭待支付单 */
    public void closeByOrder(String orderNo) {
        paymentMapper.closeByOrderNo(orderNo);
    }

    private PaymentVO toVO(Payment payment, Order order) {
        PaymentVO vo = new PaymentVO();
        vo.setPaymentNo(payment.getPaymentNo());
        vo.setOrderNo(payment.getOrderNo());
        vo.setChannel(payment.getChannel());
        vo.setChannelName(channelName(payment.getChannel()));
        vo.setAmount(payment.getAmount());
        vo.setStatus(payment.getStatus());
        vo.setStatusText(statusText(payment.getStatus()));
        vo.setPaidTime(payment.getPaidTime());
        vo.setCreateTime(payment.getCreateTime());
        if (order != null) {
            vo.setExpireAt(order.getExpireAt());
        }
        return vo;
    }

    private String channelName(Integer channel) {
        if (channel == null) {
            return "在线支付";
        }
        return switch (channel) {
            case Payment.CHANNEL_ALIPAY -> "支付宝";
            case Payment.CHANNEL_WECHAT -> "微信支付";
            case Payment.CHANNEL_CARD -> "银行卡";
            default -> "在线支付";
        };
    }

    private String statusText(Integer status) {
        if (status == null) {
            return "未知";
        }
        return switch (status) {
            case Payment.WAITING -> "待支付";
            case Payment.SUCCESS -> "支付成功";
            case Payment.FAILED -> "支付失败";
            case Payment.CLOSED -> "已关闭";
            default -> "未知";
        };
    }

    private String newPaymentNo() {
        return "P" + NO_FORMAT.format(LocalDateTime.now())
                + String.format("%04d", ThreadLocalRandom.current().nextInt(10000));
    }
}
