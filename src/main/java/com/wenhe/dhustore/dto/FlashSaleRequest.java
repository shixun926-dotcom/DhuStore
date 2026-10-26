package com.wenhe.dhustore.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 秒杀位新增/替换请求：只接受商品 ID。
 */
@Data
public class FlashSaleRequest {

    @NotNull(message = "请选择商品")
    private Long productId;
}
