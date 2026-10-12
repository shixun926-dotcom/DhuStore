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
}
