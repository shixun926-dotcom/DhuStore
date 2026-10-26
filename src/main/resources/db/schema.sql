-- DhuStore 建库建表脚本
-- 使用方法：先执行本文件，再执行 data.sql 导入种子数据

CREATE DATABASE IF NOT EXISTS dhustore DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE dhustore;

-- 用户表
CREATE TABLE IF NOT EXISTS `user` (
    `id`          BIGINT       NOT NULL AUTO_INCREMENT,
    `username`    VARCHAR(50)  NOT NULL COMMENT '用户名',
    `password`    VARCHAR(100) NOT NULL COMMENT 'BCrypt 加密后的密码',
    `nickname`    VARCHAR(50)  DEFAULT NULL COMMENT '昵称',
    `phone`       VARCHAR(20)  DEFAULT NULL COMMENT '手机号',
    `email`       VARCHAR(100) DEFAULT NULL COMMENT '邮箱',
    `avatar`      VARCHAR(255) DEFAULT NULL COMMENT '头像地址',
    `role`        TINYINT      NOT NULL DEFAULT 0 COMMENT '0-普通用户 1-管理员',
    `status`      TINYINT      NOT NULL DEFAULT 1 COMMENT '0-禁用 1-正常',
    `create_time` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `update_time` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_username` (`username`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT ='用户表';

-- 商品分类表
CREATE TABLE IF NOT EXISTS `category` (
    `id`          BIGINT      NOT NULL AUTO_INCREMENT,
    `name`        VARCHAR(50) NOT NULL COMMENT '分类名',
    `parent_id`   BIGINT      NOT NULL DEFAULT 0 COMMENT '父分类 id，0 表示顶级',
    `sort`        INT         NOT NULL DEFAULT 0 COMMENT '排序值',
    `icon`        VARCHAR(500) DEFAULT NULL COMMENT '分类图标图片地址，空则前端回落内置图形',
    `status`      TINYINT     NOT NULL DEFAULT 1 COMMENT '0-禁用 1-启用',
    `create_time` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `update_time` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT ='商品分类表';

-- 商品表
CREATE TABLE IF NOT EXISTS `product` (
    `id`          BIGINT         NOT NULL AUTO_INCREMENT,
    `category_id` BIGINT         NOT NULL COMMENT '分类 id',
    `seller_id`   BIGINT         DEFAULT NULL COMMENT '卖家用户ID，空=平台官方',
    `name`        VARCHAR(100)   NOT NULL COMMENT '商品名',
    `subtitle`    VARCHAR(200)   DEFAULT NULL COMMENT '副标题',
    `main_image`  VARCHAR(255)   DEFAULT NULL COMMENT '主图',
    `sub_images`  TEXT           COMMENT '多图，逗号分隔',
    `detail`      TEXT           COMMENT '商品详情',
    `price`       DECIMAL(10, 2) NOT NULL COMMENT '单价',
    `stock`       INT            NOT NULL DEFAULT 0 COMMENT '库存',
    `status`      TINYINT        NOT NULL DEFAULT 1 COMMENT '0-下架 1-在售',
    `sales`       INT            NOT NULL DEFAULT 0 COMMENT '销量',
    `create_time` DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `update_time` DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_category` (`category_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT ='商品表';

-- 商品发布申请表
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

-- 商品图片表（一个商品 1~9 张，sort=1 即主图）
CREATE TABLE IF NOT EXISTS `product_image` (
    `id`          BIGINT       NOT NULL AUTO_INCREMENT,
    `product_id`  BIGINT       NOT NULL COMMENT '商品ID',
    `image_url`   VARCHAR(500) NOT NULL COMMENT '图片地址',
    `sort`        INT          NOT NULL DEFAULT 1 COMMENT '图片排序，1 为主图',
    `create_time` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_product_id` (`product_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT ='商品图片表';

-- 商品申请图片表（审核通过后复制到 product_image）
CREATE TABLE IF NOT EXISTS `product_apply_image` (
    `id`          BIGINT       NOT NULL AUTO_INCREMENT,
    `apply_id`    BIGINT       NOT NULL COMMENT '申请ID',
    `image_url`   VARCHAR(500) NOT NULL COMMENT '图片地址',
    `sort`        INT          NOT NULL DEFAULT 1 COMMENT '图片排序，1 为主图',
    `create_time` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_apply_id` (`apply_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT ='商品申请图片表';

-- 收货地址表
CREATE TABLE IF NOT EXISTS `address` (
    `id`             BIGINT       NOT NULL AUTO_INCREMENT,
    `user_id`        BIGINT       NOT NULL,
    `receiver_name`  VARCHAR(50)  NOT NULL COMMENT '收货人',
    `receiver_phone` VARCHAR(20)  NOT NULL COMMENT '联系电话',
    `province`       VARCHAR(50)  DEFAULT NULL,
    `city`           VARCHAR(50)  DEFAULT NULL,
    `district`       VARCHAR(50)  DEFAULT NULL,
    `detail`         VARCHAR(255) NOT NULL COMMENT '详细地址',
    `is_default`     TINYINT      NOT NULL DEFAULT 0 COMMENT '0-否 1-是',
    `create_time`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `update_time`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_user` (`user_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT ='收货地址表';

-- 购物车表
CREATE TABLE IF NOT EXISTS `cart_item` (
    `id`          BIGINT   NOT NULL AUTO_INCREMENT,
    `user_id`     BIGINT   NOT NULL,
    `product_id`  BIGINT   NOT NULL,
    `quantity`    INT      NOT NULL DEFAULT 1 COMMENT '数量',
    `checked`     TINYINT  NOT NULL DEFAULT 1 COMMENT '0-未选中 1-选中',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_user` (`user_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT ='购物车表';

-- 订单表
CREATE TABLE IF NOT EXISTS `orders` (
    `id`               BIGINT         NOT NULL AUTO_INCREMENT,
    `order_no`         VARCHAR(32)    NOT NULL COMMENT '订单号',
    `user_id`          BIGINT         NOT NULL,
    `total_price`      DECIMAL(10, 2) NOT NULL COMMENT '订单总额',
    `payment`          TINYINT        NOT NULL DEFAULT 1 COMMENT '1-在线 2-货到付款',
    `status`           TINYINT        NOT NULL DEFAULT 0 COMMENT '0-待付款 1-已付款 2-已发货 3-已完成 4-已取消',
    `receiver_name`    VARCHAR(50)    NOT NULL,
    `receiver_phone`   VARCHAR(20)    NOT NULL,
    `receiver_address` VARCHAR(500)   NOT NULL,
    `remark`           VARCHAR(255)   DEFAULT NULL COMMENT '订单备注',
    `payment_time`     DATETIME       DEFAULT NULL,
    `create_time`      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `update_time`      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_order_no` (`order_no`),
    KEY `idx_user` (`user_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT ='订单表';

-- 订单明细表
CREATE TABLE IF NOT EXISTS `order_item` (
    `id`            BIGINT         NOT NULL AUTO_INCREMENT,
    `order_id`      BIGINT         NOT NULL,
    `product_id`    BIGINT         NOT NULL,
    `product_name`  VARCHAR(100)   NOT NULL COMMENT '下单时商品名快照',
    `product_image` VARCHAR(255)   DEFAULT NULL COMMENT '下单时主图快照',
    `unit_price`    DECIMAL(10, 2) NOT NULL COMMENT '下单时单价快照',
    `quantity`      INT            NOT NULL,
    `total_price`   DECIMAL(10, 2) NOT NULL COMMENT '小计',
    `create_time`   DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_order` (`order_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT ='订单明细表';

-- 首页轮播图（管理员维护，最多 5 张；表为空时前端渲染 5 张空白占位）
CREATE TABLE IF NOT EXISTS `banner` (
    `id`          BIGINT       NOT NULL AUTO_INCREMENT,
    `image_url`   VARCHAR(500) NOT NULL COMMENT '图片地址',
    `sort`        INT          NOT NULL DEFAULT 0 COMMENT '展示顺序，升序',
    `status`      TINYINT      NOT NULL DEFAULT 1 COMMENT '0-停用 1-启用',
    `create_time` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `update_time` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_sort` (`sort`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT ='首页轮播图（最多 5 张）';

-- 站点配置（键值对）：首页促销位图片等运营配置
CREATE TABLE IF NOT EXISTS `site_setting` (
    `setting_key`   VARCHAR(64)  NOT NULL COMMENT '配置键，如 promo_all_image',
    `setting_value` VARCHAR(500) NOT NULL DEFAULT '' COMMENT '配置值（图片地址等）',
    `update_time`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`setting_key`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT ='站点配置（键值对）';

-- 首页限时秒杀位配置
CREATE TABLE IF NOT EXISTS `flash_sale` (
    `id`          BIGINT   NOT NULL AUTO_INCREMENT,
    `product_id`  BIGINT   NOT NULL COMMENT '商品 ID',
    `sort`        INT      NOT NULL DEFAULT 0 COMMENT '展示顺序，升序',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_flash_product` (`product_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT ='首页限时秒杀位配置';
