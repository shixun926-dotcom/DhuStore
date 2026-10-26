package com.wenhe.dhustore.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 轮播图新增/替换请求：只接收已上传成功的图片地址，
 * 与商品图片复用同一个上传通道（POST /api/common/upload）。
 */
@Data
public class BannerRequest {

    @NotBlank(message = "请先上传轮播图片")
    @Size(max = 500, message = "图片地址过长")
    private String imageUrl;
}
