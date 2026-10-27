package com.wenhe.dhustore.dto;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 会话列表项：以「当前登录用户」为视角，peer* 是会话对方的公开资料。
 */
@Data
public class ConversationVO {

    private Long id;
    private Long peerId;
    private String peerName;
    private String peerAvatar;
    private Integer peerRole;
    /** 最后一条消息的类型：1-文字 2-图片；无消息时为 null */
    private Integer lastType;
    /** 最后一条消息的摘要，图片消息固定为 [图片] */
    private String lastContent;
    private Long lastSenderId;
    private LocalDateTime lastTime;
    /** 该会话中我未读的消息数 */
    private Long unread;
}
