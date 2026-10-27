package com.wenhe.dhustore.service;

import com.wenhe.dhustore.common.BusinessException;
import com.wenhe.dhustore.common.ResultCode;
import com.wenhe.dhustore.dto.CouponVO;
import com.wenhe.dhustore.entity.Coupon;
import com.wenhe.dhustore.entity.UserCoupon;
import com.wenhe.dhustore.mapper.CouponMapper;
import com.wenhe.dhustore.mapper.UserCouponMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * 优惠券：领取、我的券列表（含本单可用性判定）、下单时解析校验。
 */
@Service
@RequiredArgsConstructor
public class CouponService {

    private final CouponMapper couponMapper;
    private final UserCouponMapper userCouponMapper;
    private final PricingService pricingService;

    /** 可领取的券 */
    public List<Coupon> receivable(Long userId) {
        return couponMapper.findReceivable(userId);
    }

    /** 领取：并发下依赖 per_limit 的 SQL 条件与 received 条件更新 */
    @Transactional
    public void claim(Long userId, Long couponId) {
        Coupon coupon = couponMapper.findById(couponId);
        if (coupon == null || coupon.getStatus() == null || coupon.getStatus() != 1) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        Long owned = userCouponMapper.countByUserAndCoupon(userId, couponId);
        if (owned != null && coupon.getPerLimit() != null && owned >= coupon.getPerLimit()) {
            throw new BusinessException(ResultCode.COUPON_LIMIT);
        }
        if (couponMapper.increaseReceived(couponId) == 0) {
            throw new BusinessException(ResultCode.COUPON_SOLD_OUT);
        }
        UserCoupon uc = new UserCoupon();
        uc.setUserId(userId);
        uc.setCouponId(couponId);
        uc.setStatus(UserCoupon.UNUSED);
        try {
            userCouponMapper.insert(uc);
        } catch (DuplicateKeyException e) {
            throw new BusinessException(ResultCode.COUPON_LIMIT);
        }
    }

    /**
     * 我的券 + 本单可用性。不可用的券也会返回，附上原因，前端按「可用 / 不可用」分组展示。
     */
    public List<CouponVO> mineForOrder(Long userId, BigDecimal goodsAmount,
                                       Map<Long, BigDecimal> categoryAmounts) {
        List<CouponVO> list = userCouponMapper.findUnusedByUser(userId);
        for (CouponVO vo : list) {
            BigDecimal scopeAmount = scopeAmount(vo.getScope(), vo.getCategoryId(), goodsAmount, categoryAmounts);
            String reason = pricingService.checkCoupon(toCoupon(vo), goodsAmount, scopeAmount);
            vo.setUsable(reason == null);
            vo.setReason(reason);
        }
        return list;
    }

    /**
     * 下单时解析用户券：必须属于该用户、未使用、且本单满足条件，否则直接报错。
     */
    public Coupon resolveForOrder(Long userId, Long userCouponId, BigDecimal goodsAmount,
                                  Map<Long, BigDecimal> categoryAmounts) {
        UserCoupon uc = userCouponMapper.findByIdAndUser(userCouponId, userId);
        if (uc == null || uc.getStatus() == null || uc.getStatus() != UserCoupon.UNUSED) {
            throw new BusinessException(ResultCode.COUPON_INVALID);
        }
        Coupon coupon = couponMapper.findById(uc.getCouponId());
        BigDecimal scopeAmount = scopeAmount(coupon.getScope(), coupon.getCategoryId(), goodsAmount, categoryAmounts);
        String reason = pricingService.checkCoupon(coupon, goodsAmount, scopeAmount);
        if (reason != null) {
            throw new BusinessException(ResultCode.COUPON_INVALID.getCode(), reason);
        }
        return coupon;
    }

    /** 券适用范围内的商品金额：全场=商品总额，指定分类=该分类商品金额 */
    public BigDecimal scopeAmount(Integer scope, Long categoryId, BigDecimal goodsAmount,
                                  Map<Long, BigDecimal> categoryAmounts) {
        if (scope != null && scope == Coupon.SCOPE_CATEGORY) {
            BigDecimal v = categoryAmounts == null || categoryId == null ? null : categoryAmounts.get(categoryId);
            return v == null ? BigDecimal.ZERO : v;
        }
        return goodsAmount == null ? BigDecimal.ZERO : goodsAmount;
    }

    private Coupon toCoupon(CouponVO vo) {
        Coupon c = new Coupon();
        c.setId(vo.getCouponId());
        c.setName(vo.getName());
        c.setThreshold(vo.getThreshold());
        c.setAmount(vo.getAmount());
        c.setScope(vo.getScope());
        c.setCategoryId(vo.getCategoryId());
        c.setEndTime(vo.getEndTime());
        c.setStatus(1);
        return c;
    }
}
