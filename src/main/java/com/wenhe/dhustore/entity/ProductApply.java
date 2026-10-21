package com.wenhe.dhustore.entity;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 商品发布申请表。用户提交的商品≠正式商品，需管理员审核通过后才落进 product。
 */
@Data
public class ProductApply {

    private Long id;
    private Long userId;
    private Long categoryId;
    private String name;
    private BigDecimal price;
    private Integer stock;
    private String description;
    private String image;
    /** 0-待审核 1-通过 2-拒绝 */
    private Integer status;
    private String rejectReason;
    private LocalDateTime createTime;
    private LocalDateTime auditTime;
    private Long auditorId;

    /** 申请的图片列表（非申请表字段，由 product_apply_image 填充） */
    private List<String> images;
}
