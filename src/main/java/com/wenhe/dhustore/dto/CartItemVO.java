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
    /** 商品上下架状态：0-下架 1-在售；商品已被删除时为 null */
    private Integer status;
    private Integer quantity;
    private Integer checked;

    /** 该行是否可结算：在售且有库存。前端据此置灰并禁止勾选。 */
    public boolean isAvailable() {
        return status != null && status == 1 && stock != null && stock > 0;
    }
}
