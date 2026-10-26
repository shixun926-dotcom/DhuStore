package com.wenhe.dhustore.dto;

import lombok.Data;

import java.math.BigDecimal;

/**
 * 秒杀位展示对象：秒杀配置 + 商品实时信息（名称/价格/库存是查的那一刻的值）。
 */
@Data
public class FlashSaleVO {

    private Long id;
    private Long productId;
    private Integer sort;

    private String name;
    private String subtitle;
    private Long categoryId;
    private String mainImage;
    private BigDecimal price;
    private Integer stock;
    private Integer sales;
    /** 商品当前状态：0 下架 / 1 在售。下架后前台自动不展示 */
    private Integer status;
}
