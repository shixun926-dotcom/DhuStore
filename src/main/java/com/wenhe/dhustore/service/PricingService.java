package com.wenhe.dhustore.service;

import com.wenhe.dhustore.dto.PriceBreakdown;
import com.wenhe.dhustore.entity.Coupon;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * 价格计算：运费规则 + 满减券。全站唯一的金额口径，
 * 结算试算（preview）与真实下单（create）都调用这里。
 */
@Service
public class PricingService {

    /** 统一运费，商品金额未达门槛时收取 */
    @Value("${shop.freight.fee:10}")
    private BigDecimal freightFee;

    /** 免运费门槛 */
    @Value("${shop.freight.free-threshold:99}")
    private BigDecimal freeThreshold;

    /**
     * 运费：达到门槛免运费，空购物车不计运费。
     */
    public BigDecimal freight(BigDecimal goodsAmount) {
        if (goodsAmount == null || goodsAmount.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return goodsAmount.compareTo(freeThreshold) >= 0
                ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)
                : freightFee.setScale(2, RoundingMode.HALF_UP);
    }

    public boolean isFreeShipping(BigDecimal goodsAmount) {
        return goodsAmount != null && goodsAmount.compareTo(freeThreshold) >= 0;
    }

    public BigDecimal freeThreshold() {
        return freeThreshold;
    }

    /**
     * 判断券是否可用。可用返回 null，不可用返回具体原因（前端直接展示）。
     *
     * @param scopeAmount 券适用范围内的商品金额（全场时等于商品总额）
     */
    public String checkCoupon(Coupon coupon, BigDecimal goodsAmount, BigDecimal scopeAmount) {
        if (coupon == null) {
            return "优惠券不存在";
        }
        if (coupon.getStatus() == null || coupon.getStatus() != 1) {
            return "优惠券已停用";
        }
        if (coupon.getEndTime() != null && coupon.getEndTime().isBefore(java.time.LocalDateTime.now())) {
            return "优惠券已过期";
        }
        if (goodsAmount == null || goodsAmount.compareTo(coupon.getThreshold()) < 0) {
            return "满 " + strip(coupon.getThreshold()) + " 元可用";
        }
        if (scopeAmount == null || scopeAmount.compareTo(BigDecimal.ZERO) <= 0) {
            return "本单没有该券适用的商品";
        }
        return null;
    }

    /**
     * 抵扣金额：不超过适用商品金额，避免出现负数订单。
     */
    public BigDecimal discount(Coupon coupon, BigDecimal scopeAmount) {
        if (coupon == null || scopeAmount == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        BigDecimal amount = coupon.getAmount();
        if (amount.compareTo(scopeAmount) > 0) {
            amount = scopeAmount;
        }
        return amount.setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * 组合出完整价格明细。coupon 为 null 表示不使用优惠券。
     */
    public PriceBreakdown breakdown(BigDecimal goodsAmount, BigDecimal scopeAmount, Coupon coupon) {
        PriceBreakdown bd = new PriceBreakdown();
        BigDecimal goods = goodsAmount == null ? BigDecimal.ZERO : goodsAmount;
        BigDecimal freight = freight(goods);
        BigDecimal discount = BigDecimal.ZERO;
        if (coupon != null && checkCoupon(coupon, goods, scopeAmount) == null) {
            discount = discount(coupon, scopeAmount);
            /* couponId 由调用方写入「用户券 id」，避免与券模板 id 混淆 */
            bd.setCouponName(coupon.getName());
        }
        BigDecimal pay = goods.add(freight).subtract(discount);
        if (pay.compareTo(BigDecimal.ZERO) < 0) {
            pay = BigDecimal.ZERO;
        }
        bd.setGoodsAmount(goods.setScale(2, RoundingMode.HALF_UP));
        bd.setFreight(freight);
        bd.setDiscount(discount);
        bd.setPayAmount(pay.setScale(2, RoundingMode.HALF_UP));
        bd.setFreeShipping(isFreeShipping(goods));
        return bd;
    }

    private String strip(BigDecimal v) {
        return v == null ? "0" : v.stripTrailingZeros().toPlainString();
    }
}
