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
    /** 分类图标图片地址；为空时前端回落到内置图形 */
    private String icon;
    /** 0-禁用 1-启用 */
    private Integer status;
    /** 非数据库字段：该分类下的商品数量，仅后台列表使用 */
    private Integer productCount;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
