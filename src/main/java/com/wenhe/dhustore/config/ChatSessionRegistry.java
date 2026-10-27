package com.wenhe.dhustore.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 在线连接注册表：userId → 该用户的所有 WebSocket 连接（同一账号可多标签页）。
 *
 * 单机内存实现，多实例部署需替换为 Redis 广播；连接用 ConcurrentWebSocketSessionDecorator
 * 包装，避免并发 send 触发 "TEXT_PARTIAL_WRITING" 状态异常。
 */
@Slf4j
@Component
public class ChatSessionRegistry {

    private static final int SEND_TIME_LIMIT_MS = 5000;
    private static final int BUFFER_SIZE_LIMIT = 64 * 1024;

    private final Map<Long, Set<WebSocketSession>> sessions = new ConcurrentHashMap<>();

    public void add(Long userId, WebSocketSession session) {
        sessions.computeIfAbsent(userId, k -> ConcurrentHashMap.newKeySet())
                .add(new ConcurrentWebSocketSessionDecorator(session, SEND_TIME_LIMIT_MS, BUFFER_SIZE_LIMIT));
    }

    public void remove(Long userId, WebSocketSession session) {
        Set<WebSocketSession> set = sessions.get(userId);
        if (set == null) {
            return;
        }
        set.removeIf(s -> s.getId().equals(session.getId()) || !s.isOpen());
        if (set.isEmpty()) {
            sessions.remove(userId, set);
        }
    }

    /** 推送给该用户的所有在线连接；离线时静默丢弃，消息本身已落库 */
    public void send(Long userId, String payload) {
        Set<WebSocketSession> set = userId == null ? null : sessions.get(userId);
        if (set == null || set.isEmpty()) {
            return;
        }
        TextMessage text = new TextMessage(payload);
        for (WebSocketSession session : set) {
            if (!session.isOpen()) {
                set.remove(session);
                continue;
            }
            try {
                session.sendMessage(text);
            } catch (Exception e) {
                log.debug("WebSocket 推送失败 userId={} session={}", userId, session.getId(), e);
                set.remove(session);
            }
        }
    }

    public boolean isOnline(Long userId) {
        Set<WebSocketSession> set = userId == null ? null : sessions.get(userId);
        return set != null && !set.isEmpty();
    }
}
