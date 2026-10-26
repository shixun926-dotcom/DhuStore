package com.wenhe.dhustore.controller;

import com.wenhe.dhustore.annotation.RequireLogin;
import com.wenhe.dhustore.common.Result;
import com.wenhe.dhustore.dto.UpdateProfileRequest;
import com.wenhe.dhustore.dto.UserVO;
import com.wenhe.dhustore.service.UserService;
import com.wenhe.dhustore.util.UserContext;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    @RequireLogin
    public Result<UserVO> me() {
        return Result.success(userService.getProfile(UserContext.getUserId()));
    }

    @PutMapping("/me")
    @RequireLogin
    public Result<UserVO> update(@Valid @RequestBody UpdateProfileRequest req) {
        return Result.success(userService.updateProfile(UserContext.getUserId(), req));
    }
}
