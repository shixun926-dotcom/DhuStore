package com.wenhe.dhustore.controller;

import com.wenhe.dhustore.annotation.RequireLogin;
import com.wenhe.dhustore.common.Result;
import com.wenhe.dhustore.dto.PaymentVO;
import com.wenhe.dhustore.service.PaymentService;
import com.wenhe.dhustore.util.UserContext;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 支付：创建支付单 → 收银台 → 模拟网关回调。
 */
@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    /** 创建支付单，body: {orderNo, channel} */
    @PostMapping
    @RequireLogin
    public Result<PaymentVO> create(@RequestBody Map<String, Object> body) {
        String orderNo = String.valueOf(body.get("orderNo"));
        Integer channel = body.get("channel") == null ? null
                : Integer.valueOf(String.valueOf(body.get("channel")));
        return Result.success(paymentService.create(UserContext.getUserId(), orderNo, channel));
    }

    /**
     * 模拟三方支付网关的异步回调。
     * 真实接入时该接口由网关调用，前端不应直接触发；当前用于本地演示。
     */
    @PostMapping("/{paymentNo}/mock-callback")
    @RequireLogin
    public Result<PaymentVO> mockCallback(@PathVariable String paymentNo) {
        return Result.success(paymentService.mockCallback(paymentNo));
    }

    @GetMapping("/{paymentNo}")
    @RequireLogin
    public Result<PaymentVO> query(@PathVariable String paymentNo) {
        return Result.success(paymentService.query(paymentNo, UserContext.getUserId()));
    }
}
