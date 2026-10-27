package com.wenhe.dhustore.mapper;

import com.wenhe.dhustore.entity.Payment;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;

public interface PaymentMapper {

    int insert(Payment payment);

    Payment findByPaymentNo(@Param("paymentNo") String paymentNo);

    Payment findSuccessByOrderNo(@Param("orderNo") String orderNo);

    Payment findLatestByOrderNo(@Param("orderNo") String orderNo);

    /** 支付成功：条件更新，重复回调不会再次生效 */
    int markSuccess(@Param("paymentNo") String paymentNo, @Param("callbackNo") String callbackNo,
                    @Param("paidTime") LocalDateTime paidTime);

    int markClosed(@Param("paymentNo") String paymentNo);

    /** 关闭某订单下所有待支付单（用户取消 / 超时关单时调用） */
    int closeByOrderNo(@Param("orderNo") String orderNo);
}
