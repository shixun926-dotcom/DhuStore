package com.wenhe.dhustore.controller;

import com.wenhe.dhustore.annotation.RequireAdmin;
import com.wenhe.dhustore.common.PageResult;
import com.wenhe.dhustore.common.Result;
import com.wenhe.dhustore.dto.AdminStatsVO;
import com.wenhe.dhustore.dto.OrderVO;
import com.wenhe.dhustore.dto.RejectRequest;
import com.wenhe.dhustore.entity.ProductApply;
import com.wenhe.dhustore.service.AdminService;
import com.wenhe.dhustore.service.OrderService;
import com.wenhe.dhustore.service.ProductApplyService;
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

/**
 * 后台管理接口，全部要求管理员权限（role = 1）。
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final OrderService orderService;
    private final ProductApplyService productApplyService;

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

    @GetMapping("/product-apply")
    @RequireAdmin
    public Result<List<ProductApply>> applies(@RequestParam(required = false) Integer status) {
        return Result.success(productApplyService.adminList(status));
    }

    @PostMapping("/product-apply/{id}/approve")
    @RequireAdmin
    public Result<Void> approve(@PathVariable Long id) {
        productApplyService.approve(id, UserContext.getUserId());
        return Result.success();
    }

    @PostMapping("/product-apply/{id}/reject")
    @RequireAdmin
    public Result<Void> reject(@PathVariable Long id, @Valid @RequestBody RejectRequest req) {
        productApplyService.reject(id, UserContext.getUserId(), req.getReason());
        return Result.success();
    }
}
