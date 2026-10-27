package com.wenhe.dhustore.entity;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 退款售后单。订单主状态在审核通过后才转入「退款完成」。
 */
@Data
public class RefundRequest {

    public static final int PENDING = 0;
    public static final int AGREED = 1;
    public static final int REJECTED = 2;
    public static final int REFUNDED = 3;

    public static final int TYPE_REFUND_ONLY = 1;
    public static final int TYPE_RETURN_GOODS = 2;

    private Long id;
    private String refundNo;
    private String orderNo;
    private Long userId;
    private Integer type;
    private BigDecimal amount;
    private String reason;
    /** 凭证图地址，逗号分隔 */
    private String images;
    private Integer status;
    private String auditRemark;
    private LocalDateTime auditTime;
    private LocalDateTime createTime;
}
