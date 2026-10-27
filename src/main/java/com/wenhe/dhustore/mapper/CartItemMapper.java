package com.wenhe.dhustore.mapper;

import com.wenhe.dhustore.dto.CartItemVO;
import com.wenhe.dhustore.entity.CartItem;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface CartItemMapper {

    List<CartItem> findByUserId(Long userId);

    CartItem findByUserIdAndProductId(@Param("userId") Long userId, @Param("productId") Long productId);

    CartItem findByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);

    List<CartItemVO> findCartItemVOsByUserId(Long userId);

    /** 参与结算的行：勾选且在售有货 */
    List<CartItem> findCheckedAvailableByUserId(Long userId);

    int insert(CartItem cartItem);

    /**
     * 加入购物车（原子 upsert）。依赖 uk_user_product 唯一键：
     * 已存在则数量累加，并由 maxQuantity 封顶，避免并发下产生重复行或超量。
     */
    int upsert(@Param("userId") Long userId, @Param("productId") Long productId,
               @Param("quantity") Integer quantity, @Param("maxQuantity") Integer maxQuantity);

    int update(@Param("id") Long id, @Param("userId") Long userId,
               @Param("quantity") Integer quantity, @Param("checked") Integer checked);

    /** 全选/全不选，只作用于在售且有库存的行 */
    int updateAllChecked(@Param("userId") Long userId, @Param("checked") Integer checked);

    /** 把所有行置为未勾选（全选前先清一次，保证失效行不会残留 checked=1） */
    int clearAllChecked(Long userId);

    int countByUserId(Long userId);

    /** 已勾选但已失效（下架/售罄/已删除）的行数 */
    int countInvalidChecked(Long userId);

    int deleteById(@Param("id") Long id, @Param("userId") Long userId);

    int deleteByIds(@Param("userId") Long userId, @Param("ids") List<Long> ids);

    /** 清理失效行：商品已删除、已下架或库存为 0 */
    int deleteUnavailable(Long userId);
}
