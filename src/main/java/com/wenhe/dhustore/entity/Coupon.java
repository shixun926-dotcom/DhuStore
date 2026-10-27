package com.wenhe.dhustore.entity;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 优惠券模板。当前只支持满减券（type=1），scope 区分全场与指定分类。
 */
@Data
public class Coupon {

    /** 满减券 */
    public static final int TYPE_THRESHOLD = 1;
    /** 全场通用 */
    public static final int SCOPE_ALL = 1;
    /** 指定分类 */
    public static final int SCOPE_CATEGORY = 2;

    private Long id;
    private String name;
    private Integer type;
    private BigDecimal threshold;
    private BigDecimal amount;
    private Integer scope;
    private Long categoryId;
    private Integer total;
    private Integer received;
    private Integer perLimit;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Integer status;
    private LocalDateTime createTime;
}
