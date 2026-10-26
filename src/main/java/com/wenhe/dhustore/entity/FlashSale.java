package com.wenhe.dhustore.entity;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 首页限时秒杀位：只存商品引用与顺序，商品信息实时从 product 表取，避免价格/库存快照过期。
 */
@Data
public class FlashSale {

    private Long id;
    private Long productId;
    private Integer sort;
    private LocalDateTime createTime;
}
