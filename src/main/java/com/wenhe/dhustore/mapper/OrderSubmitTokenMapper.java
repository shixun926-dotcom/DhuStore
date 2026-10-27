package com.wenhe.dhustore.mapper;

import org.apache.ibatis.annotations.Param;

public interface OrderSubmitTokenMapper {

    int insert(@Param("token") String token, @Param("userId") Long userId);

    /** 消费令牌：只有未使用的能被消费，返回 0 表示重复提交 */
    int consume(@Param("token") String token, @Param("userId") Long userId, @Param("orderNo") String orderNo);

    String findOrderNo(@Param("token") String token, @Param("userId") Long userId);
}
