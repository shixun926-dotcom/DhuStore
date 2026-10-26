package com.wenhe.dhustore.entity;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 站点配置（键值对）。用于存放首页促销位图片等无需建表的少量运营配置。
 */
@Data
public class SiteSetting {

    private String settingKey;
    private String settingValue;
    private LocalDateTime updateTime;
}
