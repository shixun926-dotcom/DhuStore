package com.wenhe.dhustore.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * 商品新增/编辑请求。
 *
 * <p>此前接口直接接收 {@code Product} 实体，缺字段会一路穿到数据库由约束报错，
 * 前端拿到的是 500 而不是可读提示；改为 DTO 后校验统一在入参层完成。
 * 销量（sales）不在入参内，由服务端维护，避免被请求体篡改。
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class ProductRequest {

    @NotNull(message = "请选择商品分类")
    private Long categoryId;

    @NotBlank(message = "请填写商品名称")
    @Size(max = 100, message = "商品名称不能超过 100 个字符")
    private String name;

    @Size(max = 200, message = "商品副标题不能超过 200 个字符")
    private String subtitle;

    @NotNull(message = "请填写商品价格")
    @DecimalMin(value = "0.01", message = "商品价格必须大于 0")
    @Digits(integer = 8, fraction = 2, message = "商品价格最多 8 位整数、2 位小数")
    private BigDecimal price;

    @NotNull(message = "请填写商品库存")
    @Min(value = 0, message = "库存不能为负数")
    @Max(value = 999999, message = "库存不能超过 999999")
    private Integer stock;

    /** 0-下架 1-在售，缺省为在售 */
    @Min(value = 0, message = "状态取值不正确")
    @Max(value = 1, message = "状态取值不正确")
    private Integer status;

    @Size(max = 500, message = "主图地址过长")
    private String mainImage;

    @Size(max = 500, message = "多图地址过长")
    private String subImages;

    private String detail;

    /** 商品多图，第一张会作为主图 */
    @Size(max = 9, message = "商品图片最多 9 张")
    private List<String> images;

    /** 卖家用户 ID，为空表示平台自营 */
    private Long sellerId;
}
