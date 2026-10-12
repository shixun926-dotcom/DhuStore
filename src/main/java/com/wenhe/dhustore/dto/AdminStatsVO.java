package com.wenhe.dhustore.dto;

import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * 后台数据看板返回结构，字段名与前端 admin 视图约定一致：
 * kpis / trend / catShare / statusDist / topGoods。
 */
@Data
public class AdminStatsVO {

    private List<Map<String, Object>> kpis;
    private List<Map<String, Object>> trend;
    private List<Map<String, Object>> catShare;
    private List<Map<String, Object>> statusDist;
    private List<Map<String, Object>> topGoods;
}
