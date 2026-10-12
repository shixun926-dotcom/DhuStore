package com.wenhe.dhustore.entity;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 商品表
 */
@Data
public class Product {

    private Long id;
    private Long categoryId;
    private String name;
    private String subtitle;
    private String mainImage;
    /** 多图，逗号分隔或 JSON 字符串 */
    private String subImages;
    private String detail;
    private BigDecimal price;
    private Integer stock;
    /** 0-下架 1-在售 */
    private Integer status;
    private Integer sales;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
