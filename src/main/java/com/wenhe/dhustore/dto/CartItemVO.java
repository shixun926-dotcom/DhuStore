package com.wenhe.dhustore.dto;

import lombok.Data;

import java.math.BigDecimal;

/**
 * 购物车项（含商品信息），由购物车与商品表联表查询得到。
 */
@Data
public class CartItemVO {

    private Long id;
    private Long productId;
    private String productName;
    private String mainImage;
    private BigDecimal price;
    private Integer stock;
    private Integer quantity;
    private Integer checked;
}
