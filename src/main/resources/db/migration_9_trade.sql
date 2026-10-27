-- 增量迁移 9：交易链路增强（金额构成 / 优惠券 / 支付单 / 售后 / 幂等令牌）
-- 用法：mysql -uroot -p < src/main/resources/db/migration_9_trade.sql
-- 说明：可重复执行；列用 information_schema 判断，表用 CREATE TABLE IF NOT EXISTS。

USE dhustore;

-- ---------------------------------------------------------------- 1. orders 扩展
DROP PROCEDURE IF EXISTS `add_col`;
DELIMITER $$
CREATE PROCEDURE `add_col`(IN tbl VARCHAR(64), IN col VARCHAR(64), IN def TEXT)
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = col) THEN
        SET @ddl = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN `', col, '` ', def);
        PREPARE st FROM @ddl;
        EXECUTE st;
        DEALLOCATE PREPARE st;
    END IF;
END$$
DELIMITER ;

-- 金额构成：商品金额 → 运费 → 优惠 → 应付
CALL add_col('orders', 'goods_amount',  'DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT ''商品金额合计'' AFTER `total_price`');
CALL add_col('orders', 'freight',       'DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT ''运费'' AFTER `goods_amount`');
CALL add_col('orders', 'discount',      'DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT ''优惠金额'' AFTER `freight`');
CALL add_col('orders', 'pay_amount',    'DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT ''应付金额=商品+运费-优惠'' AFTER `discount`');
CALL add_col('orders', 'coupon_id',     'BIGINT DEFAULT NULL COMMENT ''使用的用户券 ID'' AFTER `pay_amount`');
-- 时间轴：下单 / 支付 / 发货 / 完成 / 超时
CALL add_col('orders', 'expire_at',     'DATETIME DEFAULT NULL COMMENT ''支付截止时间'' AFTER `payment_time`');
CALL add_col('orders', 'ship_time',     'DATETIME DEFAULT NULL COMMENT ''发货时间'' AFTER `expire_at`');
CALL add_col('orders', 'finish_time',   'DATETIME DEFAULT NULL COMMENT ''完成时间'' AFTER `ship_time`');
CALL add_col('orders', 'cancel_reason', 'VARCHAR(100) DEFAULT NULL COMMENT ''取消/关闭原因'' AFTER `finish_time`');
CALL add_col('orders', 'version',       'INT NOT NULL DEFAULT 0 COMMENT ''乐观锁版本'' AFTER `cancel_reason`');

-- 订单明细：售后状态（0 无 / 1 退款中 / 2 已退款）
CALL add_col('order_item', 'refund_status', 'TINYINT NOT NULL DEFAULT 0 COMMENT ''0-无 1-退款中 2-已退款'' AFTER `total_price`');

DROP PROCEDURE IF EXISTS `add_col`;

-- 历史订单补齐金额字段：老数据没有运费与优惠，应付=总额
UPDATE `orders` SET goods_amount = total_price WHERE goods_amount = 0 AND pay_amount = 0;
UPDATE `orders` SET pay_amount = total_price WHERE pay_amount = 0;

-- ---------------------------------------------------------------- 2. 优惠券
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

-- ---------------------------------------------------------------- 3. 支付单
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

-- ---------------------------------------------------------------- 4. 售后
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

-- ---------------------------------------------------------------- 5. 提交幂等令牌
CREATE TABLE IF NOT EXISTS `order_submit_token` (
    `token`       VARCHAR(64) NOT NULL,
    `user_id`     BIGINT      NOT NULL,
    `status`      TINYINT     NOT NULL DEFAULT 0 COMMENT '0-未使用 1-已使用',
    `order_no`    VARCHAR(32) DEFAULT NULL COMMENT '使用后关联的订单号',
    `create_time` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`token`),
    KEY `idx_token_user` (`user_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT ='下单幂等令牌';

-- ---------------------------------------------------------------- 6. 演示券
INSERT INTO `coupon` (name, type, threshold, amount, scope, total, received, per_limit, start_time, end_time, status)
SELECT '新人满 100 减 20', 1, 100.00, 20.00, 1, 0, 0, 3, '2026-01-01 00:00:00', '2027-12-31 23:59:59', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `coupon` WHERE name = '新人满 100 减 20');

INSERT INTO `coupon` (name, type, threshold, amount, scope, total, received, per_limit, start_time, end_time, status)
SELECT '全场满 300 减 50', 1, 300.00, 50.00, 1, 0, 0, 2, '2026-01-01 00:00:00', '2027-12-31 23:59:59', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `coupon` WHERE name = '全场满 300 减 50');

INSERT INTO `coupon` (name, type, threshold, amount, scope, total, received, per_limit, start_time, end_time, status)
SELECT '数码专享满 500 减 80', 1, 500.00, 80.00, 2, 0, 0, 1, '2026-01-01 00:00:00', '2027-12-31 23:59:59', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `coupon` WHERE name = '数码专享满 500 减 80');

UPDATE `coupon` c SET c.category_id = (SELECT MIN(id) FROM `category`)
WHERE c.name = '数码专享满 500 减 80' AND c.category_id IS NULL;

-- 给演示账号发券，保证进入结算页就能看到可用优惠券
INSERT INTO `user_coupon` (user_id, coupon_id, status)
SELECT u.id, c.id, 0
FROM `user` u
JOIN `coupon` c ON c.status = 1
WHERE u.username IN ('admin', 'user')
  AND NOT EXISTS (SELECT 1 FROM `user_coupon` uc WHERE uc.user_id = u.id AND uc.coupon_id = c.id);
