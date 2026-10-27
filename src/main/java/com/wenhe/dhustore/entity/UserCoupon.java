package com.wenhe.dhustore.entity;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 用户持有的优惠券。
 */
@Data
public class UserCoupon {

    /** 未使用 */
    public static final int UNUSED = 0;
    /** 已使用 */
    public static final int USED = 1;
    /** 已过期 */
    public static final int EXPIRED = 2;

    private Long id;
    private Long userId;
    private Long couponId;
    private Integer status;
    private String orderNo;
    private LocalDateTime usedTime;
    private LocalDateTime createTime;
}
