package com.wenhe.dhustore.controller;

import com.wenhe.dhustore.annotation.RequireAdmin;
import com.wenhe.dhustore.annotation.RequireLogin;
import com.wenhe.dhustore.common.PageResult;
import com.wenhe.dhustore.common.Result;
import com.wenhe.dhustore.dto.OrderCreateRequest;
import com.wenhe.dhustore.dto.OrderPreviewVO;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    /**
     * 结算页试算：金额明细 + 可用券 + 商品可购买性。
     * 传 buyNowProductId 表示立即购买，只试算该商品，不读购物车勾选。
     */
    @GetMapping("/preview")
    @RequireLogin
    public Result<OrderPreviewVO> preview(@RequestParam(required = false) Long couponId,
                                          @RequestParam(required = false) Long buyNowProductId,
                                          @RequestParam(required = false) Integer buyNowQuantity) {
        return Result.success(orderService.preview(UserContext.getUserId(), couponId,
                buyNowProductId, buyNowQuantity));
    }

    /** 一次性提交令牌，进入结算页时领取，提交订单时回传 */
    @PostMapping("/submit-token")
    @RequireLogin
    public Result<Map<String, String>> submitToken() {
        return Result.success(Map.of("token", orderService.newSubmitToken(UserContext.getUserId())));
    }

    @PostMapping
    @RequireLogin
    public Result<OrderVO> create(@Valid @RequestBody OrderCreateRequest req) {
        return Result.success(orderService.create(UserContext.getUserId(), req));
    }

    /**
     * 订单列表：statuses 支持逗号分隔的多状态（如 6,7 表示全部售后），为空返回全部。
     * 服务端分页，前端不再一次性拉全量。
     */
    @GetMapping
    @RequireLogin
    public Result<PageResult<OrderVO>> list(
            @RequestParam(required = false) String statuses,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size) {
        return Result.success(orderService.page(UserContext.getUserId(), parseStatuses(statuses), page, size));
    }

    /** "6,7" → [6, 7]；空串返回 null 表示不过滤 */
    private java.util.List<Integer> parseStatuses(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        java.util.List<Integer> list = new java.util.ArrayList<>();
        for (String part : raw.split(",")) {
            String t = part.trim();
            if (!t.isEmpty()) {
                try {
                    list.add(Integer.parseInt(t));
                } catch (NumberFormatException ignored) {
                    /* 非法值直接忽略，不影响其余状态筛选 */
                }
            }
        }
        return list.isEmpty() ? null : list;
    }

    @GetMapping("/summary")
    @RequireLogin
    public Result<Map<String, Long>> summary() {
        return Result.success(orderService.userSummary(UserContext.getUserId()));
    }

    @GetMapping("/{orderNo}")
    @RequireLogin
    public Result<OrderVO> detail(@PathVariable String orderNo) {
        return Result.success(orderService.detail(UserContext.getUserId(), orderNo));
    }

    /** 取消订单，可带原因（仅待付款） */
    @PostMapping("/{orderNo}/cancel")
    @RequireLogin
    public Result<Void> cancel(@PathVariable String orderNo,
                               @RequestParam(required = false) String reason) {
        orderService.cancel(UserContext.getUserId(), orderNo, reason);
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
