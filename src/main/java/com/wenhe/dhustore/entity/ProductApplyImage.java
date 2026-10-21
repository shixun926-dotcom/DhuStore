package com.wenhe.dhustore.entity;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 商品发布申请图片，审核通过后复制到 product_image。
 */
@Data
public class ProductApplyImage {

    private Long id;
    private Long applyId;
    private String imageUrl;
    /** 排序，1 为主图 */
    private Integer sort;
    private LocalDateTime createTime;
}
