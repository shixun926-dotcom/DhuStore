package com.wenhe.dhustore.dto;

import com.wenhe.dhustore.entity.OrderItem;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 订单展示对象：金额构成、时间轴、状态文案一并返回，前端无需再做推导。
 */
@Data
public class OrderVO {

    private Long id;
    private String orderNo;
    /** 应付金额，与 payAmount 等值，保留兼容 */
    private BigDecimal totalPrice;
    private BigDecimal goodsAmount;
    private BigDecimal freight;
    private BigDecimal discount;
    private BigDecimal payAmount;
    private Long couponId;
    private Integer payment;
    private Integer status;
    /** 状态文案，与后端 OrderStatus 保持一致 */
    private String statusText;
    private String receiverName;
    private String receiverPhone;
    private String receiverAddress;
    private String remark;
    private LocalDateTime paymentTime;
    /** 支付截止时间，前端收银台用它做倒计时 */
    private LocalDateTime expireAt;
    private LocalDateTime shipTime;
    private LocalDateTime finishTime;
    private String cancelReason;
    private LocalDateTime createTime;
    /** 该订单是否有进行中的售后 */
    private Boolean refunding;
    private List<OrderItem> items;
}
