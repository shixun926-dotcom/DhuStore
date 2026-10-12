package com.wenhe.dhustore.service;

import com.wenhe.dhustore.common.BusinessException;
import com.wenhe.dhustore.common.ResultCode;
import com.wenhe.dhustore.dto.LoginRequest;
import com.wenhe.dhustore.dto.LoginResponse;
import com.wenhe.dhustore.dto.RegisterRequest;
import com.wenhe.dhustore.dto.UpdateProfileRequest;
import com.wenhe.dhustore.dto.UserVO;
import com.wenhe.dhustore.entity.User;
import com.wenhe.dhustore.mapper.UserMapper;
import com.wenhe.dhustore.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public LoginResponse register(RegisterRequest req) {
        if (userMapper.countByUsername(req.getUsername()) > 0) {
            throw new BusinessException(ResultCode.USERNAME_EXISTS);
        }
        User user = new User();
        user.setUsername(req.getUsername());
        user.setPassword(passwordEncoder.encode(req.getPassword()));
        user.setNickname(req.getNickname() == null || req.getNickname().isBlank()
                ? req.getUsername() : req.getNickname());
        user.setPhone(req.getPhone());
        user.setEmail(req.getEmail());
        user.setRole(0);
        user.setStatus(1);
        userMapper.insert(user);

        return buildLoginResponse(user, jwtUtil.generateToken(user.getId(), user.getUsername(), user.getRole()));
    }

    public LoginResponse login(LoginRequest req) {
        User user = userMapper.findByUsername(req.getUsername());
        if (user == null || !passwordEncoder.matches(req.getPassword(), user.getPassword())) {
            throw new BusinessException(ResultCode.USERNAME_OR_PASSWORD_ERROR);
        }
        if (user.getStatus() != null && user.getStatus() == 0) {
            throw new BusinessException(ResultCode.ACCOUNT_DISABLED);
        }
        return buildLoginResponse(user, jwtUtil.generateToken(user.getId(), user.getUsername(), user.getRole()));
    }

    public UserVO getProfile(Long userId) {
        User user = userMapper.findById(userId);
        if (user == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        return toVO(user);
    }

    public UserVO updateProfile(Long userId, UpdateProfileRequest req) {
        User user = userMapper.findById(userId);
        if (user == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        userMapper.updateProfile(userId, req.getNickname(), req.getPhone(), req.getEmail(), req.getAvatar());
        return toVO(userMapper.findById(userId));
    }

    private LoginResponse buildLoginResponse(User user, String token) {
        return LoginResponse.builder()
                .token(token)
                .userId(user.getId())
                .username(user.getUsername())
                .nickname(user.getNickname())
                .avatar(user.getAvatar())
                .build();
    }

    private UserVO toVO(User user) {
        UserVO vo = new UserVO();
        vo.setId(user.getId());
        vo.setUsername(user.getUsername());
        vo.setNickname(user.getNickname());
        vo.setPhone(user.getPhone());
        vo.setEmail(user.getEmail());
        vo.setAvatar(user.getAvatar());
        vo.setRole(user.getRole());
        return vo;
    }
}
