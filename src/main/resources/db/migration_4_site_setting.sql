-- 增量迁移 4：站点配置表（首页促销位图片等）
-- 用法：mysql -uroot -p < src/main/resources/db/migration_4_site_setting.sql
-- 说明：键值结构，新增运营位只需增加一个 key，不必改动表结构。

USE dhustore;

CREATE TABLE IF NOT EXISTS `site_setting` (
    `setting_key`   VARCHAR(64)  NOT NULL COMMENT '配置键，如 promo_all_image',
    `setting_value` VARCHAR(500) NOT NULL DEFAULT '' COMMENT '配置值（图片地址等）',
    `update_time`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`setting_key`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT ='站点配置（键值对）';
