package com.wenhe.dhustore.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 分类新增/编辑请求。icon 传空串表示清除图标、回到前端内置图形。
 */
@Data
public class CategoryRequest {

    @NotBlank(message = "请填写分类名称")
    @Size(max = 50, message = "分类名称不能超过 50 个字符")
    private String name;

    /** 顶级分类固定为 0 */
    private Long parentId;

    private Integer sort;

    /** 0-禁用 1-启用 */
    private Integer status;

    @Size(max = 500, message = "图标地址过长")
    private String icon;
}
