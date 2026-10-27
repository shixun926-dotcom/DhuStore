package com.wenhe.dhustore.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 打开（或创建）与某个用户的会话。
 */
@Data
public class StartConversationRequest {

    @NotNull(message = "请选择会话对象")
    private Long userId;
}
