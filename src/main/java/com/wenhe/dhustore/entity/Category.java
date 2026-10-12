package com.wenhe.dhustore.entity;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 商品分类表
 */
@Data
public class Category {

    private Long id;
    private String name;
    private Long parentId;
    private Integer sort;
    /** 0-禁用 1-启用 */
    private Integer status;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
