package com.wenhe.dhustore.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * 售后申请：type 1-仅退款 2-退货退款，金额不得超过订单实付。
 */
@Data
public class RefundCreateRequest {

    @NotNull(message = "请选择售后类型")
    private Integer type;

    @NotNull(message = "请填写退款金额")
    @DecimalMin(value = "0.01", message = "退款金额必须大于 0")
    private BigDecimal amount;

    @NotBlank(message = "请填写退款原因")
    private String reason;

    /** 凭证图地址 */
    private List<String> images;
}
