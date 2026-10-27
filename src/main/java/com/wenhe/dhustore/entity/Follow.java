package com.wenhe.dhustore.entity;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 关注关系：follower 关注 followee，两人之间至多一条。
 */
@Data
public class Follow {

    private Long id;
    /** 关注者（粉丝） */
    private Long followerId;
    /** 被关注者 */
    private Long followeeId;
    private LocalDateTime createTime;
}
