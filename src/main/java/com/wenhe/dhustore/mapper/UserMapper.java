package com.wenhe.dhustore.mapper;

import com.wenhe.dhustore.entity.User;
import org.apache.ibatis.annotations.Param;

public interface UserMapper {

    User findByUsername(String username);

    User findById(Long id);

    int countByUsername(String username);

    int insert(User user);

    int updateProfile(@Param("userId") Long userId, @Param("nickname") String nickname,
                      @Param("phone") String phone, @Param("email") String email, @Param("avatar") String avatar);
}
