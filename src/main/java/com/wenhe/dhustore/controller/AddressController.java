package com.wenhe.dhustore.controller;

import com.wenhe.dhustore.annotation.RequireLogin;
import com.wenhe.dhustore.common.Result;
import com.wenhe.dhustore.entity.Address;
import com.wenhe.dhustore.service.AddressService;
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
@RequestMapping("/api/addresses")
@RequiredArgsConstructor
public class AddressController {

    private final AddressService addressService;

    @GetMapping
    @RequireLogin
    public Result<List<Address>> list() {
        return Result.success(addressService.list(UserContext.getUserId()));
    }

    @PostMapping
    @RequireLogin
    public Result<Void> add(@Valid @RequestBody Address address) {
        addressService.add(UserContext.getUserId(), address);
        return Result.success();
    }

    @PutMapping("/{id}")
    @RequireLogin
    public Result<Void> update(@PathVariable Long id, @Valid @RequestBody Address address) {
        addressService.update(UserContext.getUserId(), id, address);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    @RequireLogin
    public Result<Void> delete(@PathVariable Long id) {
        addressService.delete(UserContext.getUserId(), id);
        return Result.success();
    }

    @PutMapping("/{id}/default")
    @RequireLogin
    public Result<Void> setDefault(@PathVariable Long id) {
        addressService.setDefault(UserContext.getUserId(), id);
        return Result.success();
    }
}
