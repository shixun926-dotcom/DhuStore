package com.wenhe.dhustore.config;

import com.wenhe.dhustore.entity.User;
import com.wenhe.dhustore.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * 启动时确保存在两个示例账号（幂等，已存在则跳过）：
 *   admin / 123456 —— 管理员（role = 1）
 *   user  / 123456 —— 普通用户（role = 0）
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SampleDataInitializer implements CommandLineRunner {

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        ensure("admin", "123456", 1, "管理员");
        ensure("user", "123456", 0, "普通用户");
    }

    private void ensure(String username, String rawPassword, int role, String nickname) {
        if (userMapper.countByUsername(username) > 0) {
            return;
        }
        User u = new User();
        u.setUsername(username);
        u.setPassword(passwordEncoder.encode(rawPassword));
        u.setNickname(nickname);
        u.setRole(role);
        u.setStatus(1);
        userMapper.insert(u);
        log.info("已创建示例账号：{} / {}（role={}）", username, rawPassword, role);
    }
}
