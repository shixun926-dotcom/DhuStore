package com.wenhe.dhustore.entity;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 支付单：一次支付尝试对应一条记录，回调按 callbackNo 幂等。
 */
@Data
public class Payment {

    public static final int WAITING = 0;
    public static final int SUCCESS = 1;
    public static final int FAILED = 2;
    public static final int CLOSED = 3;

    public static final int CHANNEL_ALIPAY = 1;
    public static final int CHANNEL_WECHAT = 2;
    public static final int CHANNEL_CARD = 3;

    private Long id;
    private String paymentNo;
    private String orderNo;
    private Long userId;
    private Integer channel;
    private BigDecimal amount;
    private Integer status;
    private LocalDateTime paidTime;
    private String callbackNo;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
