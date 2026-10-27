package com.wenhe.dhustore.dto;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 关注 / 粉丝列表中的一行。
 * mutual 表示「对方是否也关注了我」，用于在列表上直接显示互相关注。
 */
@Data
public class FollowUserVO {

    private Long id;
    private String username;
    private String nickname;
    private String avatar;
    private Integer role;
    private Long followerCount;
    private Boolean mutual;
    private LocalDateTime followTime;
}
