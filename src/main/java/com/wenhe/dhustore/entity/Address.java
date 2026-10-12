package com.wenhe.dhustore.entity;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 收货地址表
 */
@Data
public class Address {

    private Long id;
    private Long userId;

    @NotBlank(message = "收货人不能为空")
    private String receiverName;

    @NotBlank(message = "联系电话不能为空")
    private String receiverPhone;

    private String province;
    private String city;
    private String district;

    @NotBlank(message = "详细地址不能为空")
    private String detail;

    /** 0-否 1-是 */
    private Integer isDefault;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
