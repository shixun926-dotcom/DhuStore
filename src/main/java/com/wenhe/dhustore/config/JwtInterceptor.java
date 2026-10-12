package com.wenhe.dhustore.config;

import com.wenhe.dhustore.annotation.RequireAdmin;
import com.wenhe.dhustore.annotation.RequireLogin;
import com.wenhe.dhustore.common.BusinessException;
import com.wenhe.dhustore.common.ResultCode;
import com.wenhe.dhustore.util.JwtUtil;
import com.wenhe.dhustore.util.UserContext;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * JWT 鉴权拦截器。
 * · 请求带合法 token 时，无论接口是否要求登录，都把 userId / role 写入 UserContext（可选鉴权）；
 * · 标注 @RequireLogin 的接口强制校验 token；
 * · 标注 @RequireAdmin 的接口额外要求 role = 1。
 */
@Component
@RequiredArgsConstructor
public class JwtInterceptor implements HandlerInterceptor {

    private final JwtUtil jwtUtil;

    @Value("${jwt.header:Authorization}")
    private String header;

    @Value("${jwt.token-prefix:Bearer}")
    private String tokenPrefix;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!(handler instanceof HandlerMethod handlerMethod)) {
            return true;
        }
        boolean requireLogin = handlerMethod.hasMethodAnnotation(RequireLogin.class)
                || handlerMethod.getBeanType().isAnnotationPresent(RequireLogin.class);
        boolean requireAdmin = handlerMethod.hasMethodAnnotation(RequireAdmin.class)
                || handlerMethod.getBeanType().isAnnotationPresent(RequireAdmin.class);

        String token = resolveToken(request);
        boolean hasToken = token != null && jwtUtil.validate(token);
        if (hasToken) {
            UserContext.setUserId(jwtUtil.getUserId(token));
            UserContext.setRole(jwtUtil.getRole(token));
        }

        if ((requireLogin || requireAdmin) && !hasToken) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        if (requireAdmin && (UserContext.getRole() == null || UserContext.getRole() != 1)) {
            throw new BusinessException(ResultCode.FORBIDDEN);
        }
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        UserContext.clear();
    }

    private String resolveToken(HttpServletRequest request) {
        String bearer = request.getHeader(header);
        if (bearer == null) {
            return null;
        }
        String prefix = tokenPrefix.trim();
        if (!prefix.isEmpty() && bearer.startsWith(prefix)) {
            return bearer.substring(prefix.length()).trim();
        }
        return bearer;
    }
}
