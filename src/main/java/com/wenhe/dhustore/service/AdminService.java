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

@Service
@RequiredArgsConstructor
public class AdminService {

    private static final DateTimeFormatter DAY_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter MONTH_FMT = DateTimeFormatter.ofPattern("yyyy-MM");
    private static final DateTimeFormatter MONTH_LABEL_FMT = DateTimeFormatter.ofPattern("MM-dd");

    private final StatsMapper statsMapper;

    public AdminStatsVO stats(int range) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime start = now.minusDays(range);
        LocalDateTime prevStart = now.minusDays(range * 2L);

        BigDecimal revenue = nz(statsMapper.sumRevenue(start));
        BigDecimal prevRevenue = nz(statsMapper.sumRevenueBetween(prevStart, start));
        long orders = statsMapper.countOrders(start);
        long prevOrders = statsMapper.countOrdersBetween(prevStart, start);
        long newUsers = statsMapper.countNewUsers(start);
        double avgOrder = orders > 0 ? revenue.doubleValue() / orders : 0;
        double prevAvgOrder = prevOrders > 0 ? prevRevenue.doubleValue() / prevOrders : 0;

        List<String> labels = bucketLabels(range);
        List<Double> salesSeries = alignByDay(statsMapper.salesByDay(start), labels, range);
        List<Double> ordersSeries = alignByDay(statsMapper.ordersByDay(start), labels, range);
        List<Double> newUsersSeries = alignByDay(statsMapper.newUsersByDay(start), labels, range);
        List<Double> avgSeries = new ArrayList<>();
        for (int i = 0; i < labels.size(); i++) {
            double o = ordersSeries.get(i);
            avgSeries.add(o > 0 ? salesSeries.get(i) / o : 0.0);
        }

        List<Map<String, Object>> trend = new ArrayList<>();
        for (int i = 0; i < labels.size(); i++) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("label", labels.get(i));
            m.put("value", salesSeries.get(i));
            trend.add(m);
        }

        List<Map<String, Object>> kpis = new ArrayList<>();
        kpis.add(kpi("sales", "销售额", revenue, delta(prevRevenue, revenue), sample(salesSeries), "元"));
        kpis.add(kpi("orders", "订单量", BigDecimal.valueOf(orders), delta(BigDecimal.valueOf(prevOrders), BigDecimal.valueOf(orders)), sample(ordersSeries), "笔"));
        kpis.add(kpi("avgOrder", "客单价", BigDecimal.valueOf(avgOrder), delta(BigDecimal.valueOf(prevAvgOrder), BigDecimal.valueOf(avgOrder)), sample(avgSeries), "元"));
        kpis.add(kpi("newUsers", "新增用户", BigDecimal.valueOf(newUsers), 0, sample(newUsersSeries), "人"));

        AdminStatsVO vo = new AdminStatsVO();
        vo.setKpis(kpis);
        vo.setTrend(trend);
        vo.setCatShare(sortByValue(statsMapper.catShare(start)));
        vo.setStatusDist(statsMapper.statusDist(start));
        vo.setTopGoods(sortByValue(statsMapper.topGoods(start, 5)));
        return vo;
    }

    private BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }

    private double delta(BigDecimal prev, BigDecimal cur) {
        if (prev == null || prev.compareTo(BigDecimal.ZERO) <= 0) return 0;
        return cur.subtract(prev).doubleValue() / prev.doubleValue() * 100;
    }

    private Map<String, Object> kpi(String key, String label, Object value, double delta, List<Double> spark, String unit) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("key", key);
        m.put("label", label);
        m.put("value", value);
        m.put("delta", Math.round(delta * 10) / 10.0);
        m.put("spark", spark);
        m.put("unit", unit);
        return m;
    }

    private List<String> bucketLabels(int range) {
        List<String> labels = new ArrayList<>();
        LocalDate today = LocalDate.now();
        if (range >= 365) {
            YearMonth ym = YearMonth.from(today).minusMonths(11);
            for (int i = 0; i < 12; i++) {
                labels.add(ym.plusMonths(i).format(MONTH_FMT));
            }
        } else {
            LocalDate d = today.minusDays(range - 1);
            for (int i = 0; i < range; i++) {
                labels.add(d.plusDays(i).format(MONTH_LABEL_FMT));
            }
        }
        return labels;
    }

    private List<Double> alignByDay(List<Map<String, Object>> raw, List<String> labels, int range) {
        Map<String, BigDecimal> byKey = new HashMap<>();
        for (Map<String, Object> m : raw) {
            byKey.put(String.valueOf(m.get("d")), new BigDecimal(String.valueOf(m.get("v"))));
        }
        List<Double> out = new ArrayList<>();
        LocalDate today = LocalDate.now();
        if (range >= 365) {
            YearMonth ym = YearMonth.from(today).minusMonths(11);
            for (int i = 0; i < 12; i++) {
                String prefix = ym.plusMonths(i).format(MONTH_FMT);
                BigDecimal sum = BigDecimal.ZERO;
                for (Map.Entry<String, BigDecimal> e : byKey.entrySet()) {
                    if (e.getKey().startsWith(prefix)) {
                        sum = sum.add(e.getValue());
                    }
                }
                out.add(sum.doubleValue());
            }
        } else {
            LocalDate d = today.minusDays(range - 1);
            for (int i = 0; i < range; i++) {
                String key = d.plusDays(i).format(DAY_FMT);
                BigDecimal v = byKey.get(key);
                out.add(v == null ? 0.0 : v.doubleValue());
            }
        }
        return out;
    }

    private List<Double> sample(List<Double> vals) {
        List<Double> nums = new ArrayList<>();
        for (Double v : vals) {
            if (v != null) nums.add(v);
        }
        if (nums.size() < 2) return Arrays.asList(0.0, 0.0);
        if (nums.size() <= 12) return new ArrayList<>(nums);
        List<Double> out = new ArrayList<>();
        for (int i = 0; i < 12; i++) {
            int idx = (int) Math.round(i * (nums.size() - 1) / 11.0);
            out.add(nums.get(idx));
        }
        return out;
    }

    private List<Map<String, Object>> sortByValue(List<Map<String, Object>> raw) {
        if (raw == null) return new ArrayList<>();
        raw.sort((a, b) -> Double.compare(toDouble(b.get("value")), toDouble(a.get("value"))));
        return raw;
    }

    private double toDouble(Object v) {
        if (v == null) return 0;
        return new BigDecimal(String.valueOf(v)).doubleValue();
    }
}
