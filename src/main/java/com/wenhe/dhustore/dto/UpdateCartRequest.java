package com.wenhe.dhustore.dto;

import jakarta.validation.constraints.Min;
import lombok.Data;

/**
 * 修改购物车项：数量与勾选状态可单独或同时更新（前端统一回传两者）。
 */
@Data
public class UpdateCartRequest {

    @Min(value = 1, message = "数量至少为 1")
    private Integer quantity;

    private Integer checked;
}
