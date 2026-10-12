-- 种子数据：分类与示例商品
-- 用户请通过接口注册（密码需 BCrypt 加密，无法直接以明文插入）

USE dhustore;

INSERT INTO `category` (`id`, `name`, `parent_id`, `sort`, `status`) VALUES
    (1, '手机数码', 0, 1, 1),
    (2, '电脑办公', 0, 2, 1),
    (3, '家用电器', 0, 3, 1),
    (4, '服装鞋包', 0, 4, 1),
    (5, '食品生鲜', 0, 5, 1);

INSERT INTO `product` (`category_id`, `name`, `subtitle`, `main_image`, `price`, `stock`, `status`, `sales`) VALUES
    (1, 'iPhone 15 Pro', 'A17 Pro 芯片，钛金属设计', 'https://example.com/iphone15pro.jpg', 7999.00, 100, 1, 0),
    (1, '小米 14', '骁龙 8 Gen3，徕卡光学', 'https://example.com/xiaomi14.jpg', 3999.00, 200, 1, 0),
    (2, 'MacBook Pro 14', 'M3 Pro 芯片', 'https://example.com/macbook.jpg', 16999.00, 50, 1, 0),
    (3, '戴森吸尘器 V12', '强劲吸力，轻量无绳', 'https://example.com/dyson.jpg', 3990.00, 80, 1, 0);
