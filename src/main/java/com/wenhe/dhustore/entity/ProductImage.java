package com.wenhe.dhustore.entity;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 商品图片（一个商品 1~9 张，sort=1 为主图）。
 */
@Data
public class ProductImage {

    private Long id;
    private Long productId;
    private String imageUrl;
    /** 排序，1 为主图 */
    private Integer sort;
    private LocalDateTime createTime;
}
