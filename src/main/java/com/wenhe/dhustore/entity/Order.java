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
    /** 订单总额，等值于 payAmount，保留旧字段兼容既有查询 */
    private BigDecimal totalPrice;
    /** 商品金额合计 */
    private BigDecimal goodsAmount;
    /** 运费 */
    private BigDecimal freight;
    /** 优惠金额 */
    private BigDecimal discount;
    /** 应付金额 = 商品金额 + 运费 - 优惠 */
    private BigDecimal payAmount;
    /** 使用的用户券 ID */
    private Long couponId;
    /** 支付方式 1-在线 2-货到付款 */
    private Integer payment;
    /** 0-待付款 1-待发货 2-待收货 3-已完成 4-已取消 5-已关闭 6-退款中 7-退款完成 */
    private Integer status;
    private String receiverName;
    private String receiverPhone;
    private String receiverAddress;
    private String remark;
    private LocalDateTime paymentTime;
    /** 支付截止时间，超过后由定时任务关单 */
    private LocalDateTime expireAt;
    private LocalDateTime shipTime;
    private LocalDateTime finishTime;
    /** 取消或关闭原因 */
    private String cancelReason;
    /** 乐观锁版本，每次状态变更 +1 */
    private Integer version;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;

    /** 订单明细（非数据库字段，由 Service 填充） */
    private List<OrderItem> items;
}
