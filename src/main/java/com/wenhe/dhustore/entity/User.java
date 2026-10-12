package com.wenhe.dhustore.entity;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 用户表
 */
@Data
public class User {

    private Long id;
    private String username;
    private String password;
    private String nickname;
    private String phone;
    private String email;
    private String avatar;
    /** 0-普通用户 1-管理员 */
    private Integer role;
    /** 0-禁用 1-正常 */
    private Integer status;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
