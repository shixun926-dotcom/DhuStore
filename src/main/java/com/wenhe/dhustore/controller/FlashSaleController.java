package com.wenhe.dhustore.controller;

import com.wenhe.dhustore.annotation.RequireAdmin;
import com.wenhe.dhustore.common.Result;
import com.wenhe.dhustore.dto.FlashSaleRequest;
import com.wenhe.dhustore.dto.FlashSaleVO;
import com.wenhe.dhustore.service.FlashSaleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 首页限时秒杀位。
 * · GET    /api/flash-sale            前台读取（仅在售商品）
 * · GET    /api/admin/flash-sale      后台读取（含下架商品）
 * · POST   /api/admin/flash-sale      添加
 * · PUT    /api/admin/flash-sale/{id} 替换为另一个商品
 * · DELETE /api/admin/flash-sale/{id} 移除
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class FlashSaleController {

    private final FlashSaleService flashSaleService;

    @GetMapping("/flash-sale")
    public Result<List<FlashSaleVO>> list() {
        return Result.success(flashSaleService.listActive());
    }

    @GetMapping("/admin/flash-sale")
    @RequireAdmin
    public Result<List<FlashSaleVO>> adminList() {
        return Result.success(flashSaleService.listAll());
    }

    @PostMapping("/admin/flash-sale")
    @RequireAdmin
    public Result<Void> add(@Valid @RequestBody FlashSaleRequest req) {
        flashSaleService.add(req.getProductId());
        return Result.success(null);
    }

    @PutMapping("/admin/flash-sale/{id}")
    @RequireAdmin
    public Result<Void> replace(@PathVariable Long id, @Valid @RequestBody FlashSaleRequest req) {
        flashSaleService.replace(id, req.getProductId());
        return Result.success(null);
    }

    @DeleteMapping("/admin/flash-sale/{id}")
    @RequireAdmin
    public Result<Void> remove(@PathVariable Long id) {
        flashSaleService.remove(id);
        return Result.success(null);
    }
}
