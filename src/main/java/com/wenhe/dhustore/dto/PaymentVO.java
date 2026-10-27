package com.wenhe.dhustore.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 收银台支付单。expireAt 取自订单，用于前端倒计时。
 */
@Data
public class PaymentVO {

    private String paymentNo;
    private String orderNo;
    private Integer channel;
    private String channelName;
    private BigDecimal amount;
    private Integer status;
    private String statusText;
    private LocalDateTime paidTime;
    private LocalDateTime expireAt;
    private LocalDateTime createTime;
}
