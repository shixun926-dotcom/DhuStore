package com.wenhe.dhustore.mapper;

import com.wenhe.dhustore.entity.Order;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface OrderMapper {

    int insert(Order order);

    Order findByOrderNo(String orderNo);

    Order findById(Long id);

    List<Order> findByUserId(Long userId);

    List<Order> findAll(@Param("status") Integer status, @Param("offset") int offset, @Param("size") int size);

    long countAll(@Param("status") Integer status);

    long countByUserIdAndStatus(@Param("userId") Long userId, @Param("status") Integer status);

    int updateStatus(@Param("id") Long id, @Param("status") Integer status);
}
