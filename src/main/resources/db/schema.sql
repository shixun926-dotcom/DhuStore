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
    `cover`       VARCHAR(500) DEFAULT NULL COMMENT '品类横幅地址，空则前台用色相渐变兜底',
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
    UNIQUE KEY `uk_user_product` (`user_id`, `product_id`) COMMENT '一人一商品仅一行，支持 upsert',
    KEY `idx_user` (`user_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT ='购物车表';

-- 订单表
CREATE TABLE IF NOT EXISTS `orders` (
    `id`               BIGINT         NOT NULL AUTO_INCREMENT,
    `order_no`         VARCHAR(32)    NOT NULL COMMENT '订单号',
    `user_id`          BIGINT         NOT NULL,
    `total_price`      DECIMAL(10, 2) NOT NULL COMMENT '订单总额（= pay_amount，兼容旧口径）',
    `goods_amount`     DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '商品金额合计',
    `freight`          DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '运费',
    `discount`         DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '优惠金额',
    `pay_amount`       DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '应付金额=商品+运费-优惠',
    `coupon_id`        BIGINT         DEFAULT NULL COMMENT '使用的用户券 ID',
    `payment`          TINYINT        NOT NULL DEFAULT 1 COMMENT '1-在线 2-货到付款',
    `status`           TINYINT        NOT NULL DEFAULT 0 COMMENT '0-待付款 1-待发货 2-待收货 3-已完成 4-已取消 5-已关闭 6-退款中 7-退款完成',
    `receiver_name`    VARCHAR(50)    NOT NULL,
    `receiver_phone`   VARCHAR(20)    NOT NULL,
    `receiver_address` VARCHAR(500)   NOT NULL,
    `remark`           VARCHAR(255)   DEFAULT NULL COMMENT '订单备注',
    `payment_time`     DATETIME       DEFAULT NULL,
    `expire_at`        DATETIME       DEFAULT NULL COMMENT '支付截止时间',
    `ship_time`        DATETIME       DEFAULT NULL COMMENT '发货时间',
    `finish_time`      DATETIME       DEFAULT NULL COMMENT '完成时间',
    `cancel_reason`    VARCHAR(100)   DEFAULT NULL COMMENT '取消/关闭原因',
    `version`          INT            NOT NULL DEFAULT 0 COMMENT '乐观锁版本',
    `create_time`      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `update_time`      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_order_no` (`order_no`),
    KEY `idx_user` (`user_id`),
    KEY `idx_status_expire` (`status`, `expire_at`)
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
    `refund_status` TINYINT        NOT NULL DEFAULT 0 COMMENT '0-无 1-退款中 2-已退款',
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

-- 关注关系：follower 关注 followee
CREATE TABLE IF NOT EXISTS `follow` (
    `id`          BIGINT   NOT NULL AUTO_INCREMENT,
    `follower_id` BIGINT   NOT NULL COMMENT '关注者（粉丝）用户 ID',
    `followee_id` BIGINT   NOT NULL COMMENT '被关注者用户 ID',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_follow_pair` (`follower_id`, `followee_id`),
    KEY `idx_follow_followee` (`followee_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT ='用户关注关系';

-- 会话：两人之间唯一一条，写入前按 user1_id < user2_id 归一化
CREATE TABLE IF NOT EXISTS `conversation` (
    `id`              BIGINT   NOT NULL AUTO_INCREMENT,
    `user1_id`        BIGINT   NOT NULL COMMENT '较小的用户 ID',
    `user2_id`        BIGINT   NOT NULL COMMENT '较大的用户 ID',
    `last_message_id` BIGINT   DEFAULT NULL COMMENT '最后一条消息 ID，用于列表排序与摘要',
    `create_time`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `update_time`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_conv_pair` (`user1_id`, `user2_id`),
    KEY `idx_conv_user2` (`user2_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT ='私信会话（两人一条）';

-- 消息：type 1-文字 2-图片；receiver_id 冗余存储，便于未读统计与越权校验
CREATE TABLE IF NOT EXISTS `message` (
    `id`              BIGINT        NOT NULL AUTO_INCREMENT,
    `conversation_id` BIGINT        NOT NULL COMMENT '所属会话',
    `sender_id`       BIGINT        NOT NULL COMMENT '发送者用户 ID',
    `receiver_id`     BIGINT        NOT NULL COMMENT '接收者用户 ID',
    `type`            TINYINT       NOT NULL DEFAULT 1 COMMENT '1-文字 2-图片',
    `content`         VARCHAR(1000) NOT NULL COMMENT '文字内容或图片地址',
    `is_read`         TINYINT       NOT NULL DEFAULT 0 COMMENT '0-未读 1-已读',
    `create_time`     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_msg_conv` (`conversation_id`, `id`),
    KEY `idx_msg_unread` (`receiver_id`, `is_read`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT ='私信消息';

-- 优惠券模板
CREATE TABLE IF NOT EXISTS `coupon` (
    `id`            BIGINT        NOT NULL AUTO_INCREMENT,
    `name`          VARCHAR(100)  NOT NULL COMMENT '券名称',
    `type`          TINYINT       NOT NULL DEFAULT 1 COMMENT '1-满减券',
    `threshold`     DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '使用门槛（订单商品金额）',
    `amount`        DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '抵扣金额',
    `scope`         TINYINT       NOT NULL DEFAULT 1 COMMENT '1-全场 2-指定分类',
    `category_id`   BIGINT        DEFAULT NULL COMMENT 'scope=2 时的分类',
    `total`         INT           NOT NULL DEFAULT 0 COMMENT '发放总量，0 表示不限',
    `received`      INT           NOT NULL DEFAULT 0 COMMENT '已领取数量',
    `per_limit`     INT           NOT NULL DEFAULT 1 COMMENT '每人限领',
    `start_time`    DATETIME      DEFAULT NULL COMMENT '生效时间',
    `end_time`      DATETIME      DEFAULT NULL COMMENT '失效时间',
    `status`        TINYINT       NOT NULL DEFAULT 1 COMMENT '0-停用 1-启用',
    `create_time`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT ='优惠券模板';

-- 用户持有的优惠券
CREATE TABLE IF NOT EXISTS `user_coupon` (
    `id`          BIGINT   NOT NULL AUTO_INCREMENT,
    `user_id`     BIGINT   NOT NULL,
    `coupon_id`   BIGINT   NOT NULL,
    `status`      TINYINT  NOT NULL DEFAULT 0 COMMENT '0-未使用 1-已使用 2-已过期',
    `order_no`    VARCHAR(32) DEFAULT NULL COMMENT '使用的订单号',
    `used_time`   DATETIME DEFAULT NULL,
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_uc_user` (`user_id`, `status`),
    KEY `idx_uc_coupon` (`coupon_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT ='用户持有的优惠券';

-- 支付单
CREATE TABLE IF NOT EXISTS `payment` (
    `id`           BIGINT        NOT NULL AUTO_INCREMENT,
    `payment_no`   VARCHAR(32)   NOT NULL COMMENT '支付单号',
    `order_no`     VARCHAR(32)   NOT NULL COMMENT '订单号',
    `user_id`      BIGINT        NOT NULL,
    `channel`      TINYINT       NOT NULL DEFAULT 1 COMMENT '1-支付宝 2-微信 3-银行卡',
    `amount`       DECIMAL(10,2) NOT NULL COMMENT '支付金额',
    `status`       TINYINT       NOT NULL DEFAULT 0 COMMENT '0-待支付 1-已支付 2-支付失败 3-已关闭',
    `paid_time`    DATETIME      DEFAULT NULL,
    `callback_no`  VARCHAR(64)   DEFAULT NULL COMMENT '支付网关回调流水号，用于幂等',
    `create_time`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `update_time`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_payment_no` (`payment_no`),
    UNIQUE KEY `uk_callback_no` (`callback_no`),
    KEY `idx_pay_order` (`order_no`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT ='支付单';

-- 退款售后单
CREATE TABLE IF NOT EXISTS `refund_request` (
    `id`            BIGINT        NOT NULL AUTO_INCREMENT,
    `refund_no`     VARCHAR(32)   NOT NULL COMMENT '售后单号',
    `order_no`      VARCHAR(32)   NOT NULL,
    `user_id`       BIGINT        NOT NULL,
    `type`          TINYINT       NOT NULL DEFAULT 1 COMMENT '1-仅退款 2-退货退款',
    `amount`        DECIMAL(10,2) NOT NULL COMMENT '申请退款金额',
    `reason`        VARCHAR(200)  NOT NULL COMMENT '退款原因',
    `images`        VARCHAR(1000) DEFAULT NULL COMMENT '凭证图，逗号分隔',
    `status`        TINYINT       NOT NULL DEFAULT 0 COMMENT '0-待审核 1-已同意 2-已拒绝 3-已退款',
    `audit_remark`  VARCHAR(200)  DEFAULT NULL,
    `audit_time`    DATETIME      DEFAULT NULL,
    `create_time`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_refund_no` (`refund_no`),
    KEY `idx_refund_order` (`order_no`),
    KEY `idx_refund_user` (`user_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT ='退款售后单';

-- 下单幂等令牌
CREATE TABLE IF NOT EXISTS `order_submit_token` (
    `token`       VARCHAR(64) NOT NULL,
    `user_id`     BIGINT      NOT NULL,
    `status`      TINYINT     NOT NULL DEFAULT 0 COMMENT '0-未使用 1-已使用',
    `order_no`    VARCHAR(32) DEFAULT NULL COMMENT '使用后关联的订单号',
    `create_time` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`token`),
    KEY `idx_token_user` (`user_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT ='下单幂等令牌';
