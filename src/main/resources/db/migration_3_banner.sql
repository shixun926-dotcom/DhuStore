-- 增量迁移 3：首页轮播图
-- 用法：mysql -uroot -p < src/main/resources/db/migration_3_banner.sql
-- 说明：表内默认为空，首页会自动渲染 5 张空白占位图，管理员上传后即替换。

USE dhustore;

CREATE TABLE IF NOT EXISTS `banner` (
    `id`          BIGINT       NOT NULL AUTO_INCREMENT,
    `image_url`   VARCHAR(500) NOT NULL COMMENT '图片地址（OSS 公网 URL 或 /uploads 相对路径）',
    `sort`        INT          NOT NULL DEFAULT 0 COMMENT '展示顺序，升序',
    `status`      TINYINT      NOT NULL DEFAULT 1 COMMENT '0-停用 1-启用',
    `create_time` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `update_time` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_sort` (`sort`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT ='首页轮播图（最多 5 张）';
