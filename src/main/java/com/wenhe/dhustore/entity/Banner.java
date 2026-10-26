package com.wenhe.dhustore.entity;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 首页轮播图。由管理员在后台维护，最多 5 张，sort 决定展示顺序。
 */
@Data
public class Banner {

    private Long id;
    private String imageUrl;
    private Integer sort;
    /** 0-停用 1-启用 */
    private Integer status;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
