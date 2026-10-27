package com.wenhe.dhustore.controller;

import com.wenhe.dhustore.annotation.RequireLogin;
import com.wenhe.dhustore.common.Result;
import com.wenhe.dhustore.entity.Coupon;
import com.wenhe.dhustore.service.CouponService;
import com.wenhe.dhustore.util.UserContext;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/coupons")
@RequiredArgsConstructor
public class CouponController {

    private final CouponService couponService;

    /** 可领取的优惠券 */
    @GetMapping("/receivable")
    @RequireLogin
    public Result<List<Coupon>> receivable() {
        return Result.success(couponService.receivable(UserContext.getUserId()));
    }

    /** 领取优惠券 */
    @PostMapping("/{couponId}/claim")
    @RequireLogin
    public Result<Void> claim(@PathVariable Long couponId) {
        couponService.claim(UserContext.getUserId(), couponId);
        return Result.success();
    }
}
