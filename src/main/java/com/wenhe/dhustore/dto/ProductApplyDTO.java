package com.wenhe.dhustore.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * 提交商品发布申请请求体。
 */
@Data
public class ProductApplyDTO {

    @NotNull(message = "请选择商品分类")
    private Long categoryId;

    @NotBlank(message = "商品名称不能为空")
    @Size(max = 100, message = "商品名称过长")
    private String name;

    @NotNull(message = "价格不能为空")
    @DecimalMin(value = "0.01", message = "价格必须大于 0")
    private BigDecimal price;

    @NotNull(message = "库存不能为空")
    @Min(value = 0, message = "库存不能为负")
    private Integer stock;

    private String description;

    /** 商品图片，1~9 张，第一张为主图 */
    @NotEmpty(message = "请至少上传一张商品图片")
    @Size(max = 9, message = "商品图片最多上传9张")
    private List<String> images;
}
