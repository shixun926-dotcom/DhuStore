package com.wenhe.dhustore.mapper;

import com.wenhe.dhustore.dto.CartItemVO;
import com.wenhe.dhustore.entity.CartItem;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface CartItemMapper {

    List<CartItem> findByUserId(Long userId);

    CartItem findByUserIdAndProductId(@Param("userId") Long userId, @Param("productId") Long productId);

    List<CartItemVO> findCartItemVOsByUserId(Long userId);

    int insert(CartItem cartItem);

    int update(@Param("id") Long id, @Param("userId") Long userId,
               @Param("quantity") Integer quantity, @Param("checked") Integer checked);

    int deleteById(@Param("id") Long id, @Param("userId") Long userId);

    int deleteByIds(@Param("userId") Long userId, @Param("ids") List<Long> ids);
}
