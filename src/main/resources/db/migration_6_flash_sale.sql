-- 增量迁移 6：限时秒杀商品配置
-- 用法：mysql -uroot -p < src/main/resources/db/migration_6_flash_sale.sql
-- 说明：可重复执行；秒杀位与商品是多对一引用，同一商品只能出现一次。

USE dhustore;

CREATE TABLE IF NOT EXISTS `flash_sale` (
    `id`          BIGINT   NOT NULL AUTO_INCREMENT COMMENT '主键',
    `product_id`  BIGINT   NOT NULL COMMENT '商品 ID',
    `sort`        INT      NOT NULL DEFAULT 0 COMMENT '展示顺序，升序',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_flash_product` (`product_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT ='首页限时秒杀位配置';
