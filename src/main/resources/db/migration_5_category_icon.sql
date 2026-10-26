-- 增量迁移 5：分类图标
-- 用法：mysql -uroot -p < src/main/resources/db/migration_5_category_icon.sql
-- 说明：可重复执行；已存在 icon 列时不会报错。

USE dhustore;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = 'dhustore' AND TABLE_NAME = 'category' AND COLUMN_NAME = 'icon');
SET @ddl := IF(@exist = 0,
  'ALTER TABLE category ADD COLUMN icon VARCHAR(500) NULL COMMENT ''分类图标图片地址，空则前端回落内置图形'' AFTER sort',
  'SELECT ''icon 列已存在，跳过''');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
