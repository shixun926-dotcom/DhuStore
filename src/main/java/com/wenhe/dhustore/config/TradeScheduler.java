package com.wenhe.dhustore.config;

import com.wenhe.dhustore.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 交易相关的定时任务：
 * · 每分钟关闭超时未支付订单（回补库存、退回优惠券、关闭支付单）；
 * · 每天凌晨自动确认收货（发货后超过 N 天未确认）。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TradeScheduler {

    private final OrderService orderService;

    @Value("${shop.order.auto-confirm-days:7}")
    private int autoConfirmDays;

    @Value("${shop.order.close-batch:50}")
    private int closeBatch;

    @Scheduled(fixedDelayString = "${shop.order.close-interval-ms:60000}", initialDelay = 30000)
    public void closeExpiredOrders() {
        try {
            int closed = orderService.closeExpiredOrders(closeBatch);
            if (closed > 0) {
                log.info("超时关单 {} 笔", closed);
            }
        } catch (Exception e) {
            /* 定时任务异常不能中断调度线程 */
            log.error("超时关单任务失败", e);
        }
    }

    @Scheduled(cron = "0 10 3 * * ?")
    public void autoConfirmShipped() {
        try {
            int done = orderService.autoConfirmShipped(autoConfirmDays, 200);
            if (done > 0) {
                log.info("自动确认收货 {} 笔", done);
            }
        } catch (Exception e) {
            log.error("自动确认收货任务失败", e);
        }
    }
}
