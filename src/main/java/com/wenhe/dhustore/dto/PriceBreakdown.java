package com.wenhe.dhustore.dto;

import lombok.Data;

import java.math.BigDecimal;

/**
 * 价格明细：前端展示与下单落库共用同一份计算结果，避免两端口径不一致。
 */
@Data
public class PriceBreakdown {

    /** 商品金额合计 */
    private BigDecimal goodsAmount = BigDecimal.ZERO;
    /** 运费 */
    private BigDecimal freight = BigDecimal.ZERO;
    /** 优惠金额 */
    private BigDecimal discount = BigDecimal.ZERO;
    /** 应付 = 商品 + 运费 - 优惠 */
    private BigDecimal payAmount = BigDecimal.ZERO;
    /** 命中免运费门槛时为 true，前端用于展示「已免运费」 */
    private Boolean freeShipping = false;
    private Long couponId;
    private String couponName;
}
