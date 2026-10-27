package com.wenhe.dhustore.dto;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 聊天消息。direction 为 true 表示由当前登录用户发出，前端据此决定气泡朝向。
 */
@Data
public class MessageVO {

    private Long id;
    private Long conversationId;
    private Long senderId;
    private Long receiverId;
    private Integer type;
    private String content;
    private Boolean read;
    private Boolean mine;
    private LocalDateTime createTime;
}
