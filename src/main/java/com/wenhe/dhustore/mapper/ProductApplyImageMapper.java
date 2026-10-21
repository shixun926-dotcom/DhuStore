package com.wenhe.dhustore.mapper;

import com.wenhe.dhustore.entity.ProductApplyImage;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface ProductApplyImageMapper {

    int batchInsert(@Param("items") List<ProductApplyImage> items);

    List<ProductApplyImage> findByApplyId(Long applyId);

    List<ProductApplyImage> findByApplyIds(@Param("applyIds") List<Long> applyIds);
}
