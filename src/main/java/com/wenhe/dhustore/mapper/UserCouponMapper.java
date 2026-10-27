package com.wenhe.dhustore.mapper;

import com.wenhe.dhustore.dto.CouponVO;
import com.wenhe.dhustore.entity.UserCoupon;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface UserCouponMapper {

    int insert(UserCoupon userCoupon);

    UserCoupon findById(@Param("id") Long id);

    UserCoupon findByIdAndUser(@Param("id") Long id, @Param("userId") Long userId);

    /** 该用户已持有的某张券数量，用于限领判断 */
    Long countByUserAndCoupon(@Param("userId") Long userId, @Param("couponId") Long couponId);

    /** 我持有的、仍在有效期内且未使用的券（模板信息一并带出） */
    List<CouponVO> findUnusedByUser(@Param("userId") Long userId);

    /** 标记已使用：条件更新保证同一张券不会被两笔订单同时占用 */
    int markUsed(@Param("id") Long id, @Param("userId") Long userId, @Param("orderNo") String orderNo);

    /** 订单取消 / 关闭时退回券 */
    int release(@Param("orderNo") String orderNo, @Param("userId") Long userId);
}
