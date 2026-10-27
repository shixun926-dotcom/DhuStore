package com.wenhe.dhustore.controller;

import com.wenhe.dhustore.common.PageResult;
import com.wenhe.dhustore.common.Result;
import com.wenhe.dhustore.annotation.RequireAdmin;
import com.wenhe.dhustore.dto.SellerVO;
import com.wenhe.dhustore.entity.Product;
import com.wenhe.dhustore.service.ProductService;
import com.wenhe.dhustore.service.SocialService;
import com.wenhe.dhustore.util.UserContext;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;
    private final SocialService socialService;

    @GetMapping
    public Result<PageResult<Product>> page(
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer status,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size) {
        return Result.success(productService.page(categoryId, keyword, status, page, size));
    }

    @GetMapping("/{id}")
    public Result<Product> get(@PathVariable Long id) {
        return Result.success(productService.get(id));
    }

    /** 详情页发布者摘要：seller_id 为空时返回平台自营（platform=true） */
    @GetMapping("/{id}/seller")
    public Result<SellerVO> seller(@PathVariable Long id) {
        return Result.success(socialService.sellerOfProduct(id, UserContext.getUserId()));
    }

    @PostMapping
    @RequireAdmin
    public Result<Void> create(@RequestBody Product product) {
        productService.create(product);
        return Result.success();
    }

    @PutMapping("/{id}")
    @RequireAdmin
    public Result<Void> update(@PathVariable Long id, @RequestBody Product product) {
        productService.update(id, product);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    @RequireAdmin
    public Result<Void> delete(@PathVariable Long id) {
        productService.delete(id);
        return Result.success();
    }
}
