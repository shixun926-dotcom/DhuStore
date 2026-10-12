package com.wenhe.dhustore.mapper;

import com.wenhe.dhustore.entity.OrderItem;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface OrderItemMapper {

    int batchInsert(@Param("items") List<OrderItem> items);

    List<OrderItem> findByOrderId(Long orderId);
}
