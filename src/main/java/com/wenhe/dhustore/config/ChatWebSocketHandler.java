package com.wenhe.dhustore.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

/**
 * 私信通道处理器。本通道只做下行推送与心跳，
 * 上行发送消息一律走 REST（POST /api/conversations/{id}/messages），
 * 这样消息落库顺序、事务与校验都与普通接口一致。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ChatWebSocketHandler extends TextWebSocketHandler {

    private static final String PONG = "{\"event\":\"pong\"}";

    private final ChatSessionRegistry registry;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        Long userId = userIdOf(session);
        if (userId != null) {
            registry.add(userId, session);
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        String payload = message.getPayload();
        /* 只识别心跳，其余上行内容忽略，避免通道被当作写入口使用 */
        if (payload != null && payload.contains("ping")) {
            try {
                session.sendMessage(new TextMessage(PONG));
            } catch (Exception e) {
                log.debug("心跳回复失败 session={}", session.getId(), e);
            }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        Long userId = userIdOf(session);
        if (userId != null) {
            registry.remove(userId, session);
        }
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        log.debug("WebSocket 传输异常 session={}", session.getId(), exception);
    }

    private Long userIdOf(WebSocketSession session) {
        Object userId = session.getAttributes().get("userId");
        return userId instanceof Long id ? id : null;
    }
}
