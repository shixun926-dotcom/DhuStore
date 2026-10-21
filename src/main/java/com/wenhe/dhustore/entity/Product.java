package com.wenhe.dhustore.entity;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 商品表
 */
@Data
public class Product {

    private Long id;
    private Long categoryId;
    /** 卖家用户ID，空=平台官方 */
    private Long sellerId;
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

    /** 图片列表（非商品表字段，由 product_image 填充；第一张即主图） */
    private List<String> images;
}
