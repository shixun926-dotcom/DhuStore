package com.wenhe.dhustore.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class OrderCreateRequest {

    @NotNull(message = "收货地址不能为空")
    private Long addressId;

    /** 支付方式 1-在线 2-货到付款，默认 1 */
    private Integer payment;

    private String remark;

    /** 使用哪张用户券（user_coupon.id），不传表示不使用 */
    private Long couponId;

    /**
     * 提交令牌：进入结算页时申请，提交后消费。
     * 同一令牌重复提交只会产生一笔订单，服务端据此返回已创建的订单。
     */
    private String submitToken;
}
