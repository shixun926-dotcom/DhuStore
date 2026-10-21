package com.wenhe.dhustore.mapper;

import com.wenhe.dhustore.entity.ProductApply;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface ProductApplyMapper {

    int insert(ProductApply apply);

    ProductApply findById(Long id);

    List<ProductApply> findByUserId(Long userId);

    List<ProductApply> findAll(@Param("status") Integer status);

    int update(ProductApply apply);
}
