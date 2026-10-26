package com.wenhe.dhustore.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 修改个人资料请求。nickname/phone/email 允许置空；avatar 为 null 时不更新，传空串表示清除头像。
 */
@Data
public class UpdateProfileRequest {

    @Size(max = 50, message = "昵称不能超过 50 个字符")
    private String nickname;

    @Size(max = 20, message = "手机号不能超过 20 个字符")
    private String phone;

    @Size(max = 100, message = "邮箱不能超过 100 个字符")
    private String email;

    /** 图片地址，长度受 user.avatar 的 VARCHAR(255) 约束 */
    @Size(max = 255, message = "头像地址过长")
    private String avatar;
}
