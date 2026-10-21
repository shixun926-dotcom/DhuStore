package com.wenhe.dhustore.mapper;

import com.wenhe.dhustore.entity.ProductImage;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface ProductImageMapper {

    int batchInsert(@Param("items") List<ProductImage> items);

    List<ProductImage> findByProductId(Long productId);

    int deleteByProductId(Long productId);
}
