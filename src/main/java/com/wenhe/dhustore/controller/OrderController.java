package com.wenhe.dhustore.controller;

import com.wenhe.dhustore.annotation.RequireAdmin;
import com.wenhe.dhustore.annotation.RequireLogin;
import com.wenhe.dhustore.common.Result;
import com.wenhe.dhustore.dto.OrderCreateRequest;
import com.wenhe.dhustore.dto.OrderVO;
import com.wenhe.dhustore.service.OrderService;
import com.wenhe.dhustore.util.UserContext;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @PostMapping
    @RequireLogin
    public Result<OrderVO> create(@Valid @RequestBody OrderCreateRequest req) {
        return Result.success(orderService.create(UserContext.getUserId(), req));
    }

    @GetMapping
    @RequireLogin
    public Result<List<OrderVO>> list() {
        return Result.success(orderService.list(UserContext.getUserId()));
    }

    @GetMapping("/{orderNo}")
    @RequireLogin
    public Result<OrderVO> detail(@PathVariable String orderNo) {
        return Result.success(orderService.detail(UserContext.getUserId(), orderNo));
    }

    @PostMapping("/{orderNo}/pay")
    @RequireLogin
    public Result<Void> pay(@PathVariable String orderNo) {
        orderService.pay(UserContext.getUserId(), orderNo);
        return Result.success();
    }

    @PostMapping("/{orderNo}/cancel")
    @RequireLogin
    public Result<Void> cancel(@PathVariable String orderNo) {
        orderService.cancel(UserContext.getUserId(), orderNo);
        return Result.success();
    }

    @PostMapping("/{orderNo}/confirm")
    @RequireLogin
    public Result<Void> confirm(@PathVariable String orderNo) {
        orderService.confirm(UserContext.getUserId(), orderNo);
        return Result.success();
    }

    @PostMapping("/{orderNo}/ship")
    @RequireAdmin
    public Result<Void> ship(@PathVariable String orderNo) {
        orderService.ship(orderNo);
        return Result.success();
    }
}
