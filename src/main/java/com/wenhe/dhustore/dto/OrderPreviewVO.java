package com.wenhe.dhustore.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * 结算页试算结果：与下单使用同一套计算，前端只负责展示。
 */
@Data
public class OrderPreviewVO {

    private List<PreviewItem> items;
    private PriceBreakdown price;
    /** 我的券（含不可用项与原因） */
    private List<CouponVO> coupons;
    /** 默认收货地址 ID，未设置地址时为空 */
    private Long addressId;
    /** 支付超时分钟数，前端用于收银台倒计时文案 */
    private Integer payTimeoutMinutes;
    /** 免运费门槛，前端用于「再买 X 元免运费」提示 */
    private java.math.BigDecimal freeThreshold;
    /** 购物车中是否全部可购买，false 时前端禁用提交 */
    private Boolean purchasable;
    /** 不可购买的具体提示 */
    private String errorTip;
    /** 非阻断性提示，例如「2 件商品已失效，未参与本次结算」 */
    private String notice;

    @Data
    public static class PreviewItem {
        private Long cartItemId;
        private Long productId;
        private String productName;
        private String productImage;
        private Long categoryId;
        private BigDecimal price;
        private Integer quantity;
        private Integer stock;
        /** 商品是否仍在售且有货 */
        private Boolean available;
        private BigDecimal subtotal;
    }
}
