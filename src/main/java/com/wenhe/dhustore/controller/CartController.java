package com.wenhe.dhustore.controller;

import com.wenhe.dhustore.annotation.RequireLogin;
import com.wenhe.dhustore.common.Result;
import com.wenhe.dhustore.dto.AddCartRequest;
import com.wenhe.dhustore.dto.CartItemVO;
import com.wenhe.dhustore.dto.UpdateCartRequest;
import com.wenhe.dhustore.dto.UpdateCheckedRequest;
import com.wenhe.dhustore.service.CartService;
import com.wenhe.dhustore.util.UserContext;
import jakarta.validation.Valid;
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

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    @GetMapping
    @RequireLogin
    public Result<List<CartItemVO>> list() {
        return Result.success(cartService.list(UserContext.getUserId()));
    }

    /** 返回该商品在购物车中的最终数量，前端据此提示「已达库存上限」 */
    @PostMapping
    @RequireLogin
    public Result<Integer> add(@Valid @RequestBody AddCartRequest req) {
        return Result.success(cartService.add(UserContext.getUserId(), req.getProductId(), req.getQuantity()));
    }

    @PutMapping("/{id}")
    @RequireLogin
    public Result<Void> update(@PathVariable Long id, @Valid @RequestBody UpdateCartRequest req) {
        cartService.update(UserContext.getUserId(), id, req.getQuantity(), req.getChecked());
        return Result.success();
    }

    @PutMapping("/{id}/checked")
    @RequireLogin
    public Result<Void> updateChecked(@PathVariable Long id, @Valid @RequestBody UpdateCheckedRequest req) {
        cartService.update(UserContext.getUserId(), id, null, req.getChecked());
        return Result.success();
    }

    /** 全选 / 全不选：仅作用于在售且有库存的行，返回受影响条数 */
    @PutMapping("/checked-all")
    @RequireLogin
    public Result<Integer> checkAll(@Valid @RequestBody UpdateCheckedRequest req) {
        return Result.success(cartService.setAllChecked(UserContext.getUserId(), req.getChecked()));
    }

    /** 批量删除：ids 逗号分隔，一次往返替代前端 N 次循环删除 */
    @DeleteMapping("/batch")
    @RequireLogin
    public Result<Integer> deleteBatch(@RequestParam String ids) {
        List<Long> list = new ArrayList<>();
        for (String part : ids.split(",")) {
            String t = part.trim();
            if (t.isEmpty()) {
                continue;
            }
            try {
                list.add(Long.parseLong(t));
            } catch (NumberFormatException ignored) {
                /* 非法 id 忽略，不影响其余条目 */
            }
        }
        return Result.success(cartService.deleteBatch(UserContext.getUserId(), list));
    }

    /** 一键清理失效商品（已下架 / 已删除 / 无库存） */
    @DeleteMapping("/unavailable")
    @RequireLogin
    public Result<Integer> clearUnavailable() {
        return Result.success(cartService.clearUnavailable(UserContext.getUserId()));
    }

    @DeleteMapping("/{id}")
    @RequireLogin
    public Result<Void> delete(@PathVariable Long id) {
        cartService.delete(UserContext.getUserId(), id);
        return Result.success();
    }
}
