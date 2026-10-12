package com.wenhe.dhustore.controller;

import com.wenhe.dhustore.annotation.RequireAdmin;
import com.wenhe.dhustore.common.PageResult;
import com.wenhe.dhustore.common.Result;
import com.wenhe.dhustore.dto.AdminStatsVO;
import com.wenhe.dhustore.dto.OrderVO;
import com.wenhe.dhustore.service.AdminService;
import com.wenhe.dhustore.service.OrderService;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 后台管理接口，全部要求管理员权限（role = 1）。
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final OrderService orderService;

    @GetMapping("/stats")
    @RequireAdmin
    public Result<AdminStatsVO> stats(@RequestParam(defaultValue = "30") int range) {
        return Result.success(adminService.stats(range));
    }

    @GetMapping("/orders")
    @RequireAdmin
    public Result<PageResult<OrderVO>> orders(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Integer status) {
        return Result.success(orderService.pageAllForAdmin(status, page, size));
    }

    @GetMapping("/orders/pending-count")
    @RequireAdmin
    public Result<Long> pendingCount() {
        return Result.success(orderService.countPendingShipments());
    }

    @GetMapping("/orders/summary")
    @RequireAdmin
    public Result<Map<String, Long>> orderSummary() {
        return Result.success(orderService.pendingSummary());
    }
}
