-- 增量迁移：为已初始化的数据库补充「用户发布商品」所需结构
-- 执行方式：在图形工具里直接运行本文件（或 mysql -uroot -p < 本文件）

USE dhustore;

-- 1. 商品表增加卖家归属字段（空 = 平台官方）
ALTER TABLE `product`
    ADD COLUMN `seller_id` BIGINT DEFAULT NULL COMMENT '卖家用户ID，空=平台官方' AFTER `category_id`;

-- 2. 新增商品发布申请表
CREATE TABLE IF NOT EXISTS `product_apply` (
    `id`            BIGINT         NOT NULL AUTO_INCREMENT,
    `user_id`       BIGINT         NOT NULL COMMENT '申请用户ID',
    `category_id`   BIGINT         NOT NULL COMMENT '商品分类ID',
    `name`          VARCHAR(100)   NOT NULL COMMENT '商品名称',
    `price`         DECIMAL(10, 2) NOT NULL COMMENT '商品价格',
    `stock`         INT            NOT NULL DEFAULT 0 COMMENT '库存',
    `description`   TEXT           COMMENT '商品描述',
    `image`         VARCHAR(500)   DEFAULT NULL COMMENT '商品图片',
    `status`        TINYINT        NOT NULL DEFAULT 0 COMMENT '0-待审核 1-通过 2-拒绝',
    `reject_reason` VARCHAR(500)   DEFAULT NULL COMMENT '拒绝原因',
    `create_time`   DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `audit_time`    DATETIME       DEFAULT NULL COMMENT '审核时间',
    `auditor_id`    BIGINT         DEFAULT NULL COMMENT '审核管理员ID',
    PRIMARY KEY (`id`),
    KEY `idx_user` (`user_id`),
    KEY `idx_status` (`status`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT ='商品发布申请表';
