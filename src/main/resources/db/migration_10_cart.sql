-- 增量迁移 10：购物车一致性加固
-- 用法：mysql -uroot -p < src/main/resources/db/migration_10_cart.sql
-- 说明：可重复执行。核心目的是给 cart_item 补 (user_id, product_id) 唯一约束，
--       使「加入购物车」可以走 upsert，避免并发/连点产生同一商品多行。

USE dhustore;

-- ---------------------------------------------------------------- 1. 合并历史重复行
-- 同一用户同一商品只保留 id 最小的一行，数量累计后按当前库存封顶（库存为 0 时保留 1 行用于展示缺货）。
DROP TEMPORARY TABLE IF EXISTS `tmp_cart_merge`;
CREATE TEMPORARY TABLE `tmp_cart_merge` AS
SELECT user_id, product_id, MIN(id) AS keep_id, SUM(quantity) AS total_qty
FROM cart_item
GROUP BY user_id, product_id;

UPDATE cart_item c
    JOIN `tmp_cart_merge` t ON c.id = t.keep_id
    LEFT JOIN product p ON p.id = c.product_id
SET c.quantity = LEAST(t.total_qty, GREATEST(IFNULL(p.stock, 1), 1))
WHERE t.total_qty > 0;

DELETE c FROM cart_item c
    JOIN `tmp_cart_merge` t
      ON c.user_id = t.user_id AND c.product_id = t.product_id
WHERE c.id <> t.keep_id;

DROP TEMPORARY TABLE IF EXISTS `tmp_cart_merge`;

-- ---------------------------------------------------------------- 2. 唯一键
SET @has_uk = (SELECT COUNT(*) FROM information_schema.STATISTICS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cart_item'
                 AND INDEX_NAME = 'uk_user_product');
SET @ddl = IF(@has_uk = 0,
    'ALTER TABLE `cart_item` ADD UNIQUE KEY `uk_user_product` (`user_id`, `product_id`)',
    'DO 0');
PREPARE st FROM @ddl;
EXECUTE st;
DEALLOCATE PREPARE st;

-- ---------------------------------------------------------------- 3. 数量下限兜底
UPDATE cart_item SET quantity = 1 WHERE quantity IS NULL OR quantity < 1;
