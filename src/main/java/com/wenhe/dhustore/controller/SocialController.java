package com.wenhe.dhustore.controller;

import com.wenhe.dhustore.annotation.RequireLogin;
import com.wenhe.dhustore.common.PageResult;
import com.wenhe.dhustore.common.Result;
import com.wenhe.dhustore.dto.FollowUserVO;
import com.wenhe.dhustore.dto.PublicUserVO;
import com.wenhe.dhustore.service.SocialService;
import com.wenhe.dhustore.util.UserContext;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 社交关系：关注 / 取消关注 / 关注与粉丝列表 / 公开用户资料。
 * 公开资料接口不强制登录，登录时额外返回 following（我是否已关注）与 self（是否本人）。
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class SocialController {

    private final SocialService socialService;

    @PostMapping("/follow/{userId}")
    @RequireLogin
    public Result<Void> follow(@PathVariable Long userId) {
        socialService.follow(UserContext.getUserId(), userId);
        return Result.success();
    }

    @DeleteMapping("/follow/{userId}")
    @RequireLogin
    public Result<Void> unfollow(@PathVariable Long userId) {
        socialService.unfollow(UserContext.getUserId(), userId);
        return Result.success();
    }

    @GetMapping("/follow/following")
    @RequireLogin
    public Result<PageResult<FollowUserVO>> following(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return Result.success(socialService.following(UserContext.getUserId(), page, size));
    }

    @GetMapping("/follow/followers")
    @RequireLogin
    public Result<PageResult<FollowUserVO>> followers(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return Result.success(socialService.followers(UserContext.getUserId(), page, size));
    }

    /** 个人中心身份卡用：我的关注数与粉丝数 */
    @GetMapping("/follow/stats")
    @RequireLogin
    public Result<Map<String, Long>> stats() {
        return Result.success(socialService.stats(UserContext.getUserId()));
    }

    @GetMapping("/users/{id}/profile")
    public Result<PublicUserVO> profile(@PathVariable Long id) {
        return Result.success(socialService.profile(id, UserContext.getUserId()));
    }
}
