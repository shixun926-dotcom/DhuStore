package com.wenhe.dhustore.config;

import com.wenhe.dhustore.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

/**
 * WebSocket 握手鉴权。
 * 浏览器 WebSocket API 无法自定义请求头，因此 token 通过 query 传递：
 *   ws://host/ws/chat?token=<JWT>
 * 校验失败直接以 401 拒绝握手，不会建立连接。
 */
@Component
@RequiredArgsConstructor
public class JwtHandshakeInterceptor implements HandshakeInterceptor {

    private final JwtUtil jwtUtil;

    @Value("${jwt.token-prefix:Bearer}")
    private String tokenPrefix;

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Map<String, Object> attributes) {
        String token = resolveToken(request);
        if (token == null || !jwtUtil.validate(token)) {
            response.setStatusCode(HttpStatus.UNAUTHORIZED);
            return false;
        }
        attributes.put("userId", jwtUtil.getUserId(token));
        attributes.put("role", jwtUtil.getRole(token));
        return true;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler wsHandler, Exception exception) {
        // 无需处理
    }

    private String resolveToken(ServerHttpRequest request) {
        if (!(request instanceof ServletServerHttpRequest servletRequest)) {
            return null;
        }
        String token = servletRequest.getServletRequest().getParameter("token");
        if (token == null) {
            return null;
        }
        token = token.trim();
        String prefix = tokenPrefix == null ? "" : tokenPrefix.trim();
        if (!prefix.isEmpty() && token.startsWith(prefix)) {
            token = token.substring(prefix.length()).trim();
        }
        return token.isEmpty() ? null : token;
    }
}
