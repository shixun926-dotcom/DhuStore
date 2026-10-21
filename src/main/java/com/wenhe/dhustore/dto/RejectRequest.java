package com.wenhe.dhustore.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 拒绝商品发布申请请求体。
 */
@Data
public class RejectRequest {

    @NotBlank(message = "请填写拒绝原因")
    private String reason;
}
