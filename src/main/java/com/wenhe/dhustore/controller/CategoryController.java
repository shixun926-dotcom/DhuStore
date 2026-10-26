package com.wenhe.dhustore.controller;

import com.wenhe.dhustore.annotation.RequireAdmin;
import com.wenhe.dhustore.common.Result;
import com.wenhe.dhustore.dto.CategoryRequest;
import com.wenhe.dhustore.entity.Category;
import com.wenhe.dhustore.service.CategoryService;
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
 * 商品分类。
 * · GET    /api/categories           前台列表（公开）
 * · GET    /api/categories/{id}      分类详情（公开）
 * · GET    /api/admin/categories     后台列表，带商品数量（管理员）
 * · POST   /api/admin/categories     新增（管理员）
 * · PUT    /api/admin/categories/{id} 编辑（管理员）
 * · DELETE /api/admin/categories/{id} 删除，分类下有商品时返回 2012（管理员）
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    @GetMapping("/categories")
    public Result<List<Category>> list() {
        return Result.success(categoryService.list());
    }

    @GetMapping("/categories/{id}")
    public Result<Category> get(@PathVariable Long id) {
        return Result.success(categoryService.get(id));
    }

    @GetMapping("/admin/categories")
    @RequireAdmin
    public Result<List<Category>> adminList() {
        return Result.success(categoryService.listWithCount());
    }

    @PostMapping("/admin/categories")
    @RequireAdmin
    public Result<Category> create(@Valid @RequestBody CategoryRequest req) {
        return Result.success(categoryService.create(req));
    }

    @PutMapping("/admin/categories/{id}")
    @RequireAdmin
    public Result<Category> update(@PathVariable Long id, @Valid @RequestBody CategoryRequest req) {
        return Result.success(categoryService.update(id, req));
    }

    @DeleteMapping("/admin/categories/{id}")
    @RequireAdmin
    public Result<Void> delete(@PathVariable Long id) {
        categoryService.delete(id);
        return Result.success(null);
    }
}
