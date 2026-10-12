package com.wenhe.dhustore.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateCheckedRequest {

    @NotNull(message = "选中状态不能为空")
    private Integer checked;
}
