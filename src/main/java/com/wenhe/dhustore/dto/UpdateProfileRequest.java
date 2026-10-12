package com.wenhe.dhustore.dto;

import lombok.Data;

/**
 * 修改个人资料请求。nickname/phone/email 允许置空；avatar 为空时不更新。
 */
@Data
public class UpdateProfileRequest {

    private String nickname;
    private String phone;
    private String email;
    private String avatar;
}
