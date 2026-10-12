package com.wenhe.dhustore.entity;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 订单表
 */
@Data
public class Order {

    private Long id;
    private String orderNo;
    private Long userId;
    private BigDecimal totalPrice;
    /** 支付方式 1-在线 2-货到付款 */
    private Integer payment;
    /** 0-待付款 1-已付款 2-已发货 3-已完成 4-已取消 */
    private Integer status;
    private String receiverName;
    private String receiverPhone;
    private String receiverAddress;
    private String remark;
    private LocalDateTime paymentTime;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;

    /** 订单明细（非数据库字段，由 Service 填充） */
    private List<OrderItem> items;
}
