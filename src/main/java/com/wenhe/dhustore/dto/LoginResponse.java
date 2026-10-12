package com.wenhe.dhustore.dto;

import lombok.Builder;
import lombok.Data;

/**
 * 登录/注册成功后的返回，包含 token 与基础用户信息。
 */
@Data
@Builder
public class LoginResponse {

    private String token;
    private Long userId;
    private String username;
    private String nickname;
    private String avatar;
}
