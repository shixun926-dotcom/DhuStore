package com.wenhe.dhustore.entity;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 私信消息：type 1-文字 2-图片。
 * receiverId 为冗余字段，用于未读统计与接收方校验，避免每次都回查会话表。
 */
@Data
public class Message {

    /** 文字消息 */
    public static final int TYPE_TEXT = 1;
    /** 图片消息，content 存图片地址 */
    public static final int TYPE_IMAGE = 2;

    private Long id;
    private Long conversationId;
    private Long senderId;
    private Long receiverId;
    private Integer type;
    private String content;
    /** 0-未读 1-已读（以接收方视角） */
    private Integer isRead;
    private LocalDateTime createTime;
}
