package com.wenhe.dhustore.dto;

import lombok.Data;

/**
 * 对外公开的用户资料：不含手机号、邮箱等隐私字段。
 * following 表示「当前登录用户是否已关注此人」，未登录时为 false。
 */
@Data
public class PublicUserVO {

    private Long id;
    private String username;
    private String nickname;
    private String avatar;
    private Integer role;
    /** 他关注了多少人 */
    private Long followingCount;
    /** 他有多少粉丝 */
    private Long followerCount;
    /** 当前登录用户是否已关注他 */
    private Boolean following;
    /** 是否就是当前登录用户本人 */
    private Boolean self;
}
