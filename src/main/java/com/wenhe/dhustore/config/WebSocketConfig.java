package com.wenhe.dhustore.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

/**
 * 私信实时通道：/ws/chat?token=<JWT>。
 * 只用于服务端推送（新消息、未读变化），发送消息仍走 REST，保证落库顺序与事务一致性。
 */
@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketConfigurer {

    private final ChatWebSocketHandler chatWebSocketHandler;
    private final JwtHandshakeInterceptor jwtHandshakeInterceptor;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(chatWebSocketHandler, "/ws/chat")
                .addInterceptors(jwtHandshakeInterceptor)
                .setAllowedOriginPatterns("*");
    }
}
