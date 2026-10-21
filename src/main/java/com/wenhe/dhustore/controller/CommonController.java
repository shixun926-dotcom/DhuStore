package com.wenhe.dhustore.controller;

import com.wenhe.dhustore.annotation.RequireLogin;
import com.wenhe.dhustore.common.Result;
import com.wenhe.dhustore.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * 通用接口：图片上传。
 */
@RestController
@RequestMapping("/api/common")
@RequiredArgsConstructor
public class CommonController {

    private final FileStorageService fileStorageService;

    @PostMapping("/upload")
    @RequireLogin
    public Result<String> upload(@RequestParam("file") MultipartFile file) {
        return Result.success(fileStorageService.store(file));
    }
}
