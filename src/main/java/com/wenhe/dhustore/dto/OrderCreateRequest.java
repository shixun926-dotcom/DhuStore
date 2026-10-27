package com.wenhe.dhustore.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class OrderCreateRequest {

    @NotNull(message = "收货地址不能为空")
    private Long addressId;

    /** 支付方式 1-在线 2-货到付款，默认 1 */
    private Integer payment;

    private String remark;

    /** 使用哪张用户券（user_coupon.id），不传表示不使用 */
    private Long couponId;

    /**
     * 提交令牌：进入结算页时申请，提交后消费。
     * 同一令牌重复提交只会产生一笔订单，服务端据此返回已创建的订单。
     */
    private String submitToken;

    /**
     * 立即购买：指定商品直接下单，不读购物车、也不删除购物车。
     * 与购物车下单走同一套算价与扣库存逻辑，二选一，不能同时生效。
     */
    private Long buyNowProductId;

    /** 立即购买数量，缺省 1 */
    private Integer buyNowQuantity;
}
