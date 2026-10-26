package com.wenhe.dhustore.controller;

import com.wenhe.dhustore.annotation.RequireAdmin;
import com.wenhe.dhustore.common.Result;
import com.wenhe.dhustore.dto.PromoSettingRequest;
import com.wenhe.dhustore.service.SiteSettingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 首页促销位（全部商品 / 新人礼包）图片配置。
 * · GET /api/home/promos        前台读取，公开
 * · PUT /api/admin/home/promos  后台保存，管理员
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class HomePromoController {

    private final SiteSettingService siteSettingService;

    @GetMapping("/home/promos")
    public Result<Map<String, String>> list() {
        return Result.success(siteSettingService.promos());
    }

    @PutMapping("/admin/home/promos")
    @RequireAdmin
    public Result<Map<String, String>> save(@Valid @RequestBody PromoSettingRequest req) {
        siteSettingService.savePromos(req.getAll(), req.getNewUser());
        return Result.success(siteSettingService.promos());
    }
}
