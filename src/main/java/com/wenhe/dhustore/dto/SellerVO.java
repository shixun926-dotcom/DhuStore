package com.wenhe.dhustore.dto;

import lombok.Data;

/**
 * 商品详情页的发布者摘要。
 *
 * platform = true 表示平台自营（product.seller_id 为空）：卡片不提供关注与「发消息」按钮，
 * 而是整体作为入口，点击后与平台官方账号（serviceUserId）建立会话。
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
    /**
     * 平台自营时的官方客服账号 ID（role=1 且状态正常）。
     * 可能为空：站点没有可用管理员账号时前端应给出提示而非跳转。
     */
    private Long serviceUserId;
}
