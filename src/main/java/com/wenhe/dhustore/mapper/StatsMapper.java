package com.wenhe.dhustore.mapper;

import org.apache.ibatis.annotations.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 后台看板统计查询。
 */
public interface StatsMapper {

    BigDecimal sumRevenue(@Param("start") LocalDateTime start);

    BigDecimal sumRevenueBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    long countOrders(@Param("start") LocalDateTime start);

    long countOrdersBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    long countNewUsers(@Param("start") LocalDateTime start);

    List<Map<String, Object>> salesByDay(@Param("start") LocalDateTime start);

    List<Map<String, Object>> ordersByDay(@Param("start") LocalDateTime start);

    List<Map<String, Object>> newUsersByDay(@Param("start") LocalDateTime start);

    List<Map<String, Object>> catShare(@Param("start") LocalDateTime start);

    List<Map<String, Object>> statusDist(@Param("start") LocalDateTime start);

    List<Map<String, Object>> topGoods(@Param("start") LocalDateTime start, @Param("limit") int limit);
}
