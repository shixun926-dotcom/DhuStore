package com.wenhe.dhustore.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 发送消息请求：type 1-文字（content 为文本）2-图片（content 为图片地址）。
 */
@Data
public class SendMessageRequest {

    @NotNull(message = "消息类型不能为空")
    private Integer type;

    @Size(max = 1000, message = "消息内容不能超过 1000 字")
    private String content;
}
