-- 增量迁移 8：社交与私信（关注关系 / 会话 / 消息）
-- 用法：mysql -uroot -p < src/main/resources/db/migration_8_social.sql
-- 说明：可重复执行；全部使用 CREATE TABLE IF NOT EXISTS，已存在则跳过。

USE dhustore;

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
