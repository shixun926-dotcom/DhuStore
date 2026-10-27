package com.wenhe.dhustore.service;

import com.wenhe.dhustore.dto.MessageVO;

/**
 * 私信推送出口。REST 发送落库后由 ChatService 调用，
 * 由 WebSocket 实现负责实际投递；未启用推送时为空实现。
 */
public interface ChatNotifier {

    /** 新消息已落库：推送给接收方，并携带其最新未读数 */
    void messageCreated(MessageVO message, Long receiverId);

    /** 会话已读后通知本人其他终端刷新未读 */
    void unreadChanged(Long userId, long unread);
}
