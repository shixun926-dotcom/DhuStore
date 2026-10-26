-- 增量迁移 7：分类封面（16:9 场景图）
-- 用法：mysql -uroot -p < src/main/resources/db/migration_7_category_cover.sql
-- 说明：可重复执行；已存在 cover 列时不会报错。

USE dhustore;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = 'dhustore' AND TABLE_NAME = 'category' AND COLUMN_NAME = 'cover');

SET @sql := IF(@exist = 0,
    'ALTER TABLE `category` ADD COLUMN `cover` VARCHAR(500) DEFAULT NULL COMMENT ''品类横幅地址，空则前台用色相渐变兜底'' AFTER `icon`',
    'SELECT ''cover 列已存在，跳过'' AS msg');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
