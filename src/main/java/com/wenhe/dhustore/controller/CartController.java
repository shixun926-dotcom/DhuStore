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
import org.springframework.web.bind.annotation.RestController;

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

    @PostMapping
    @RequireLogin
    public Result<Void> add(@Valid @RequestBody AddCartRequest req) {
        cartService.add(UserContext.getUserId(), req.getProductId(), req.getQuantity());
        return Result.success();
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

    @DeleteMapping("/{id}")
    @RequireLogin
    public Result<Void> delete(@PathVariable Long id) {
        cartService.delete(UserContext.getUserId(), id);
        return Result.success();
    }
}
