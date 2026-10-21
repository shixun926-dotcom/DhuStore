package com.wenhe.dhustore.controller;

import com.wenhe.dhustore.annotation.RequireLogin;
import com.wenhe.dhustore.common.Result;
import com.wenhe.dhustore.dto.ProductApplyDTO;
import com.wenhe.dhustore.entity.ProductApply;
import com.wenhe.dhustore.service.ProductApplyService;
import com.wenhe.dhustore.util.UserContext;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 商品发布申请（用户侧）。
 */
@RestController
@RequestMapping("/api/product-apply")
@RequiredArgsConstructor
public class ProductApplyController {

    private final ProductApplyService productApplyService;

    @PostMapping
    @RequireLogin
    public Result<Void> apply(@Valid @RequestBody ProductApplyDTO dto) {
        productApplyService.apply(UserContext.getUserId(), dto);
        return Result.success();
    }

    @GetMapping("/my")
    @RequireLogin
    public Result<List<ProductApply>> myList() {
        return Result.success(productApplyService.myList(UserContext.getUserId()));
    }
}
