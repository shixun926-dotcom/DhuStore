package com.wenhe.dhustore.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 用户视角的优惠券：模板信息 + 可用性判定结果。
 */
@Data
public class CouponVO {

    /** user_coupon.id，下单时传这个 */
    private Long id;
    private Long couponId;
    private String name;
    private BigDecimal threshold;
    private BigDecimal amount;
    private Integer scope;
    private Long categoryId;
    private LocalDateTime endTime;
    /** 当前购物车是否可用 */
    private Boolean usable;
    /** 不可用原因，可用时为空 */
    private String reason;
}
