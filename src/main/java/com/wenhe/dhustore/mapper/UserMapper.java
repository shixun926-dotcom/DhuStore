package com.wenhe.dhustore.mapper;

import com.wenhe.dhustore.entity.User;
import org.apache.ibatis.annotations.Param;

public interface UserMapper {

    User findByUsername(String username);

    User findById(Long id);

    /**
     * 平台官方账号：role=1 且状态正常的第一个账号。
     * 用于「东华自营」商品的客服会话入口（自营商品没有真实卖家）。
     */
    User findPlatformAccount();

    int countByUsername(String username);

    int insert(User user);

    int updateProfile(@Param("userId") Long userId, @Param("nickname") String nickname,
                      @Param("phone") String phone, @Param("email") String email, @Param("avatar") String avatar);
}
