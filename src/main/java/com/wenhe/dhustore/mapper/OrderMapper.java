package com.wenhe.dhustore.mapper;

import com.wenhe.dhustore.entity.Order;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface OrderMapper {

    int insert(Order order);

    Order findByOrderNo(String orderNo);

    Order findById(Long id);

    /** 用户侧分页，statuses 为 null 或空表示全部（支持「售后」「已取消」这类多状态分组） */
    List<Order> pageByUser(@Param("userId") Long userId, @Param("statuses") List<Integer> statuses,
                           @Param("offset") int offset, @Param("size") int size);

    long countByUser(@Param("userId") Long userId, @Param("statuses") List<Integer> statuses);

    List<Order> findAll(@Param("status") Integer status, @Param("offset") int offset, @Param("size") int size);

    long countAll(@Param("status") Integer status);

    long countByUserIdAndStatus(@Param("userId") Long userId, @Param("status") Integer status);

    /**
     * 状态迁移的唯一入口：WHERE 带旧状态，影响行数为 0 即表示并发冲突。
     * 时间字段与取消原因按需传入，null 则不更新。
     */
    int transit(@Param("orderNo") String orderNo,
                @Param("from") int from,
                @Param("to") int to,
                @Param("payTime") LocalDateTime payTime,
                @Param("shipTime") LocalDateTime shipTime,
                @Param("finishTime") LocalDateTime finishTime,
                @Param("cancelReason") String cancelReason);

    /** 超时未支付的订单 */
    List<Order> findExpired(@Param("now") LocalDateTime now, @Param("limit") int limit);

    /** 已发货超过 N 天、仍未确认收货的订单（自动确认收货用） */
    List<Order> findShippedBefore(@Param("deadline") LocalDateTime deadline, @Param("limit") int limit);
}
