package com.wenhe.dhustore.service;

import com.wenhe.dhustore.config.ChatSessionRegistry;
import com.wenhe.dhustore.dto.MessageVO;
import com.wenhe.dhustore.mapper.MessageMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 通过 WebSocket 下发私信事件。
 * 仅在消息已成功落库后调用，推送失败不影响业务结果（离线用户下次拉取即可）。
 *
 * 事件格式：
 *   {"event":"message","data":{MessageVO},"unread":3}
 *   {"event":"unread","unread":0}
 *   {"event":"pong"}
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketChatNotifier implements ChatNotifier {

    private final ChatSessionRegistry registry;
    private final MessageMapper messageMapper;
    private final ObjectMapper objectMapper;

    @Override
    public void messageCreated(MessageVO message, Long receiverId) {
        long unread = messageMapper.countUnread(receiverId);
        /* mine 是「相对当前登录用户」的视角字段：发送方为 true，接收方必须为 false */
        push(receiverId, "message", asReceiverView(message), unread);
        /* 发送者的其他标签页也同步一份，避免多端显示不一致 */
        push(message.getSenderId(), "message", message, -1);
    }

    @Override
    public void unreadChanged(Long userId, long unread) {
        push(userId, "unread", null, unread);
    }

    private MessageVO asReceiverView(MessageVO source) {
        MessageVO copy = new MessageVO();
        copy.setId(source.getId());
        copy.setConversationId(source.getConversationId());
        copy.setSenderId(source.getSenderId());
        copy.setReceiverId(source.getReceiverId());
        copy.setType(source.getType());
        copy.setContent(source.getContent());
        copy.setRead(source.getRead());
        copy.setCreateTime(source.getCreateTime());
        copy.setMine(false);
        return copy;
    }

    private void push(Long userId, String event, Object data, long unread) {
        if (userId == null || !registry.isOnline(userId)) {
            return;
        }
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("event", event);
        if (data != null) {
            payload.put("data", data);
        }
        if (unread >= 0) {
            payload.put("unread", unread);
        }
        try {
            registry.send(userId, objectMapper.writeValueAsString(payload));
        } catch (Exception e) {
            log.warn("私信事件序列化失败 userId={} event={}", userId, event, e);
        }
    }
}
