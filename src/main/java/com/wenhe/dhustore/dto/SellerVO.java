package com.wenhe.dhustore.dto;

import lombok.Data;

/**
 * 商品详情页的发布者摘要。
 * platform 为 true 表示平台自营（product.seller_id 为空），此时不提供关注与私信。
 */
@Data
public class SellerVO {

    private Long id;
    private String nickname;
    private String avatar;
    private Integer role;
    private Long followerCount;
    /** 当前登录用户是否已关注该卖家 */
    private Boolean following;
    /** 卖家是否就是当前登录用户 */
    private Boolean self;
    /** 平台自营标记 */
    private Boolean platform;
}
