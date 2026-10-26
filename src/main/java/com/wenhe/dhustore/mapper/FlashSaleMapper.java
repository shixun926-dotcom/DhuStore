package com.wenhe.dhustore.mapper;

import com.wenhe.dhustore.dto.FlashSaleVO;
import com.wenhe.dhustore.entity.FlashSale;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface FlashSaleMapper {

    /** 后台：全部配置（含已下架商品） */
    List<FlashSaleVO> findAllVO();

    /** 前台：只返回商品仍在售的条目 */
    List<FlashSaleVO> findActiveVO();

    FlashSale findById(Long id);

    FlashSale findByProductId(Long productId);

    int countAll();

    int insert(FlashSale flashSale);

    int updateProduct(@Param("id") Long id, @Param("productId") Long productId);

    int deleteById(Long id);
}
