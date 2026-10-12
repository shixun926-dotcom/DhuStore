package com.wenhe.dhustore.dto;

import lombok.Data;

/**
 * 对外暴露的用户信息（不含密码）。
 */
@Data
public class UserVO {

    private Long id;
    private String username;
    private String nickname;
    private String phone;
    private String email;
    private String avatar;
    private Integer role;
}
