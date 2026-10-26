package com.wenhe.dhustore.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 首页两个促销位的图片配置。空串表示清除图片、回到默认渐变卡片。
 */
@Data
public class PromoSettingRequest {

    /** 全部商品位 */
    @Size(max = 500, message = "图片地址过长")
    private String all;

    /** 新人礼包位 */
    @Size(max = 500, message = "图片地址过长")
    private String newUser;
}
