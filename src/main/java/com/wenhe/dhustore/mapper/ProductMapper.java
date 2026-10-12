package com.wenhe.dhustore.mapper;

import com.wenhe.dhustore.entity.Product;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface ProductMapper {

    Product findById(Long id);

    List<Product> findList(@Param("categoryId") Long categoryId,
                           @Param("keyword") String keyword,
                           @Param("status") Integer status,
                           @Param("offset") int offset,
                           @Param("size") int size);

    long countList(@Param("categoryId") Long categoryId, @Param("keyword") String keyword, @Param("status") Integer status);

    int insert(Product product);

    int update(Product product);

    int deleteById(Long id);

    /** 扣减库存并增加销量，库存不足时返回 0 */
    int deductStock(@Param("id") Long id, @Param("quantity") int quantity);

    /** 归还库存（取消订单时），并回退销量 */
    int restoreStock(@Param("id") Long id, @Param("quantity") int quantity);
}
