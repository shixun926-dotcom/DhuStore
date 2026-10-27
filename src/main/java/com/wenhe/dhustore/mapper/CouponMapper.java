package com.wenhe.dhustore.mapper;

import com.wenhe.dhustore.dto.CouponVO;
import com.wenhe.dhustore.entity.Coupon;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface CouponMapper {

    Coupon findById(@Param("id") Long id);

    /** 当前可领取的券（启用且未过期） */
    List<Coupon> findReceivable(@Param("userId") Long userId);

    int increaseReceived(@Param("id") Long id);
}
