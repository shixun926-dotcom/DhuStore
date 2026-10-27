package com.wenhe.dhustore.service;

import com.wenhe.dhustore.dto.AdminStatsVO;
import com.wenhe.dhustore.mapper.StatsMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 后台数据看板。
 *
 * <p>时间轴（趋势图横轴）是这里唯一的公共结构：先按 range 生成一次
 * {@link Axis}，再由各指标复用它对齐数据库分组结果，避免日期序列与标签
 * 两处各自生成、跨零点时出现错位。
 */
@Service
@RequiredArgsConstructor
public class AdminService {

    private static final DateTimeFormatter DAY_KEY = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter MONTH_KEY = DateTimeFormatter.ofPattern("yyyy-MM");
    /** 图表横轴标签统一用 MM-dd，月度视图下同样适用 */
    private static final DateTimeFormatter LABEL = DateTimeFormatter.ofPattern("MM-dd");

    /** 趋势窗口上限：两年，超出无实际意义且会生成巨型数组 */
    private static final int MIN_RANGE = 1;
    private static final int MAX_RANGE = 730;
    /** 月度视图固定展示 12 个月 */
    private static final int MONTH_BUCKETS = 12;
    /** 迷你走势图采样点数 */
    private static final int SPARK_POINTS = 12;

    private final StatsMapper statsMapper;

    public AdminStatsVO stats(int range) {
        int days = clampRange(range);
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime start = now.minusDays(days);
        LocalDateTime prevStart = now.minusDays(days * 2L);
        Axis axis = axis(days);

        BigDecimal revenue = nz(statsMapper.sumRevenue(start));
        BigDecimal prevRevenue = nz(statsMapper.sumRevenueBetween(prevStart, start));
        long orders = statsMapper.countOrders(start);
        long prevOrders = statsMapper.countOrdersBetween(prevStart, start);
        long newUsers = statsMapper.countNewUsers(start);
        double avgOrder = orders > 0 ? revenue.doubleValue() / orders : 0;
        double prevAvgOrder = prevOrders > 0 ? prevRevenue.doubleValue() / prevOrders : 0;

        List<Double> salesSeries = align(statsMapper.salesByDay(start), axis);
        List<Double> ordersSeries = align(statsMapper.ordersByDay(start), axis);
        List<Double> newUsersSeries = align(statsMapper.newUsersByDay(start), axis);
        List<Double> avgSeries = divide(salesSeries, ordersSeries);

        List<Map<String, Object>> trend = new ArrayList<>(axis.labels().size());
        for (int i = 0; i < axis.labels().size(); i++) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("label", axis.labels().get(i));
            m.put("value", salesSeries.get(i));
            trend.add(m);
        }

        List<Map<String, Object>> kpis = new ArrayList<>();
        kpis.add(kpi("sales", "销售额", revenue, delta(prevRevenue, revenue), sample(salesSeries), "元"));
        kpis.add(kpi("orders", "订单量", BigDecimal.valueOf(orders),
                delta(BigDecimal.valueOf(prevOrders), BigDecimal.valueOf(orders)), sample(ordersSeries), "笔"));
        kpis.add(kpi("avgOrder", "客单价", BigDecimal.valueOf(avgOrder),
                delta(BigDecimal.valueOf(prevAvgOrder), BigDecimal.valueOf(avgOrder)), sample(avgSeries), "元"));
        /* 新增用户无同期对比口径，涨幅固定 0 */
        kpis.add(kpi("newUsers", "新增用户", BigDecimal.valueOf(newUsers), 0, sample(newUsersSeries), "人"));

        AdminStatsVO vo = new AdminStatsVO();
        vo.setKpis(kpis);
        vo.setTrend(trend);
        vo.setCatShare(sortByValue(statsMapper.catShare(start)));
        vo.setStatusDist(statsMapper.statusDist(start));
        vo.setTopGoods(sortByValue(statsMapper.topGoods(start, 5)));
        return vo;
    }

    /* ------------------------------------------------------------ 时间轴 */

    /**
     * @param monthly true 表示按月聚合（key 为 yyyy-MM），否则按日（key 为 yyyy-MM-dd）
     */
    private record Axis(boolean monthly, List<String> keys, List<String> labels) {
    }

    private Axis axis(int days) {
        List<String> keys = new ArrayList<>();
        List<String> labels = new ArrayList<>();
        if (days >= 365) {
            YearMonth start = YearMonth.from(LocalDate.now()).minusMonths(MONTH_BUCKETS - 1L);
            for (int i = 0; i < MONTH_BUCKETS; i++) {
                YearMonth ym = start.plusMonths(i);
                String key = ym.format(MONTH_KEY);
                keys.add(key);
                /* 月度视图的横轴直接展示 yyyy-MM，与日视图的 MM-dd 保持同样的信息密度 */
                labels.add(key);
            }
            return new Axis(true, keys, labels);
        }
        LocalDate start = LocalDate.now().minusDays(days - 1L);
        for (int i = 0; i < days; i++) {
            LocalDate d = start.plusDays(i);
            keys.add(d.format(DAY_KEY));
            labels.add(d.format(LABEL));
        }
        return new Axis(false, keys, labels);
    }

    /** 把「日期 → 值」的结果对齐到时间轴；缺失的桶补 0，月度视图按前缀累加 */
    private List<Double> align(List<Map<String, Object>> raw, Axis axis) {
        Map<String, Double> bucket = new HashMap<>();
        for (Map<String, Object> row : raw) {
            String key = String.valueOf(row.get("d"));
            if (axis.monthly() && key.length() > 7) {
                key = key.substring(0, 7);
            }
            bucket.merge(key, toDouble(row.get("v")), Double::sum);
        }
        List<Double> out = new ArrayList<>(axis.keys().size());
        for (String key : axis.keys()) {
            out.add(bucket.getOrDefault(key, 0.0));
        }
        return out;
    }

    /** 逐桶相除，分母为 0 时记 0 */
    private List<Double> divide(List<Double> numerator, List<Double> denominator) {
        List<Double> out = new ArrayList<>(numerator.size());
        for (int i = 0; i < numerator.size(); i++) {
            double d = denominator.get(i);
            out.add(d > 0 ? numerator.get(i) / d : 0.0);
        }
        return out;
    }

    private int clampRange(int range) {
        return Math.max(MIN_RANGE, Math.min(range, MAX_RANGE));
    }

    /* ------------------------------------------------------------ KPI */

    private BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }

    /** 环比涨幅（%），上期为 0 时无意义，返回 0 */
    private double delta(BigDecimal prev, BigDecimal cur) {
        if (prev == null || prev.compareTo(BigDecimal.ZERO) <= 0) {
            return 0;
        }
        return cur.subtract(prev).doubleValue() / prev.doubleValue() * 100;
    }

    private Map<String, Object> kpi(String key, String label, Object value, double delta,
                                    List<Double> spark, String unit) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("key", key);
        m.put("label", label);
        m.put("value", value);
        m.put("delta", round1(delta));
        m.put("spark", spark);
        m.put("unit", unit);
        return m;
    }

    private double round1(double v) {
        return Math.round(v * 10) / 10.0;
    }

    /** 等距降采样到固定点数，供 KPI 卡片上的迷你走势 */
    private List<Double> sample(List<Double> values) {
        List<Double> nums = new ArrayList<>();
        for (Double v : values) {
            if (v != null) {
                nums.add(v);
            }
        }
        if (nums.size() < 2) {
            return Arrays.asList(0.0, 0.0);
        }
        if (nums.size() <= SPARK_POINTS) {
            return new ArrayList<>(nums);
        }
        List<Double> out = new ArrayList<>(SPARK_POINTS);
        for (int i = 0; i < SPARK_POINTS; i++) {
            int idx = (int) Math.round(i * (nums.size() - 1) / (double) (SPARK_POINTS - 1));
            out.add(nums.get(idx));
        }
        return out;
    }

    /** 按 value 降序；不改动入参，避免调用方拿到被重排的原始列表 */
    private List<Map<String, Object>> sortByValue(List<Map<String, Object>> raw) {
        List<Map<String, Object>> list = raw == null ? new ArrayList<>() : new ArrayList<>(raw);
        list.sort((a, b) -> Double.compare(toDouble(b.get("value")), toDouble(a.get("value"))));
        return list;
    }

    private double toDouble(Object v) {
        if (v == null) {
            return 0;
        }
        return new BigDecimal(String.valueOf(v)).doubleValue();
    }
}
