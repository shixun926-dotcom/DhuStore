-- 增量迁移：商品多图（product_image / product_apply_image）
-- 执行方式：在图形工具里直接运行本文件

USE dhustore;

CREATE TABLE IF NOT EXISTS `product_image` (
    `id`          BIGINT       NOT NULL AUTO_INCREMENT,
    `product_id`  BIGINT       NOT NULL COMMENT '商品ID',
    `image_url`   VARCHAR(500) NOT NULL COMMENT '图片地址',
    `sort`        INT          NOT NULL DEFAULT 1 COMMENT '图片排序，1 为主图',
    `create_time` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_product_id` (`product_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT ='商品图片表';

CREATE TABLE IF NOT EXISTS `product_apply_image` (
    `id`          BIGINT       NOT NULL AUTO_INCREMENT,
    `apply_id`    BIGINT       NOT NULL COMMENT '申请ID',
    `image_url`   VARCHAR(500) NOT NULL COMMENT '图片地址',
    `sort`        INT          NOT NULL DEFAULT 1 COMMENT '图片排序，1 为主图',
    `create_time` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_apply_id` (`apply_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT ='商品申请图片表';

-- 已上架商品若只有 main_image，可补一张主图记录（可选）
INSERT INTO product_image (product_id, image_url, sort)
SELECT p.id, p.main_image, 1
FROM product p
WHERE p.main_image IS NOT NULL AND p.main_image <> ''
  AND NOT EXISTS (SELECT 1 FROM product_image pi WHERE pi.product_id = p.id);
