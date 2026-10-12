package com.wenhe.dhustore.entity;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 购物车表
 */
@Data
public class CartItem {

    private Long id;
    private Long userId;
    private Long productId;
    private Integer quantity;
    /** 0-未选中 1-选中 */
    private Integer checked;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
