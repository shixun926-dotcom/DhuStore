package com.wenhe.dhustore.controller;

import com.wenhe.dhustore.annotation.RequireAdmin;
import com.wenhe.dhustore.common.Result;
import com.wenhe.dhustore.dto.BannerRequest;
import com.wenhe.dhustore.entity.Banner;
import com.wenhe.dhustore.service.BannerService;
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
 * 首页轮播图。
 * · GET /api/banners            前台读取（公开，仅启用项，最多 5 条）
 * · GET /api/admin/banners      后台读取全部
 * · POST /api/admin/banners     新增（达到 5 张返回 2011）
 * · PUT /api/admin/banners/{id} 替换图片
 * · DELETE /api/admin/banners/{id} 删除
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class BannerController {

    private final BannerService bannerService;

    @GetMapping("/banners")
    public Result<List<Banner>> list() {
        return Result.success(bannerService.listPublic());
    }

    @GetMapping("/admin/banners")
    @RequireAdmin
    public Result<List<Banner>> adminList() {
        return Result.success(bannerService.listAll());
    }

    @PostMapping("/admin/banners")
    @RequireAdmin
    public Result<Banner> create(@Valid @RequestBody BannerRequest req) {
        return Result.success(bannerService.create(req.getImageUrl()));
    }

    @PutMapping("/admin/banners/{id}")
    @RequireAdmin
    public Result<Void> replace(@PathVariable Long id, @Valid @RequestBody BannerRequest req) {
        bannerService.replaceImage(id, req.getImageUrl());
        return Result.success(null);
    }

    @DeleteMapping("/admin/banners/{id}")
    @RequireAdmin
    public Result<Void> delete(@PathVariable Long id) {
        bannerService.delete(id);
        return Result.success(null);
    }
}
