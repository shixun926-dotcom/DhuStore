package com.wenhe.dhustore.controller;

import com.wenhe.dhustore.annotation.RequireAdmin;
import com.wenhe.dhustore.annotation.RequireLogin;
import com.wenhe.dhustore.common.Result;
import com.wenhe.dhustore.dto.RefundCreateRequest;
import com.wenhe.dhustore.entity.RefundRequest;
import com.wenhe.dhustore.service.RefundService;
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
 * 退款售后：用户申请与查询，管理员审核。
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class RefundController {

    private final RefundService refundService;

    @PostMapping("/orders/{orderNo}/refund")
    @RequireLogin
    public Result<RefundRequest> apply(@PathVariable String orderNo,
                                       @Valid @RequestBody RefundCreateRequest req) {
        return Result.success(refundService.apply(UserContext.getUserId(), orderNo, req));
    }

    @GetMapping("/refunds")
    @RequireLogin
    public Result<List<RefundRequest>> myList() {
        return Result.success(refundService.myList(UserContext.getUserId()));
    }

    @GetMapping("/refunds/{refundNo}")
    @RequireLogin
    public Result<RefundRequest> detail(@PathVariable String refundNo) {
        return Result.success(refundService.detail(refundNo));
    }

    @GetMapping("/admin/refunds")
    @RequireAdmin
    public Result<List<RefundRequest>> adminList(@RequestParam(required = false) Integer status) {
        return Result.success(refundService.adminList(status));
    }

    /** 审核：body {agree: true/false, remark: "..."} */
    @PostMapping("/admin/refunds/{refundNo}/audit")
    @RequireAdmin
    public Result<Void> audit(@PathVariable String refundNo, @RequestBody Map<String, Object> body) {
        boolean agree = Boolean.parseBoolean(String.valueOf(body.get("agree")));
        String remark = body.get("remark") == null ? null : String.valueOf(body.get("remark"));
        refundService.audit(refundNo, agree, remark);
        return Result.success();
    }
}
