package com.wenhe.dhustore.entity;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 私信会话：每两个用户之间只有一条，user1Id 恒小于 user2Id。
 */
@Data
public class Conversation {

    private Long id;
    /** 较小的用户 ID */
    private Long user1Id;
    /** 较大的用户 ID */
    private Long user2Id;
    /** 最后一条消息 ID，为空表示会话尚未产生消息 */
    private Long lastMessageId;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
