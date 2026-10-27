package com.wenhe.dhustore.common;

/**
 * 订单状态机。
 *
 * <pre>
 *  0 待付款 ──支付成功──> 1 待发货 ──发货──> 2 待收货 ──确认收货──> 3 已完成
 *     │                                          │
 *     ├──用户取消──> 4 已取消                     └──申请退款──> 6 退款中
 *     └──超时关单──> 5 已关闭                              │
 *                                                   同意──> 7 退款完成
 *                                                   拒绝──> 回到 2
 * </pre>
 *
 * 允许的迁移集中在 {@link #canTransit(int, int)}，Service 层先判状态再执行条件更新，
 * 条件更新（WHERE status = 旧值）保证并发下只有一个请求成功。
 */
public final class OrderStatus {

    /** 待付款 */
    public static final int PENDING_PAY = 0;
    /** 已付款 / 待发货 */
    public static final int PAID = 1;
    /** 已发货 / 待收货 */
    public static final int SHIPPED = 2;
    /** 已完成 */
    public static final int FINISHED = 3;
    /** 用户主动取消 */
    public static final int CANCELED = 4;
    /** 超时未付款，系统关闭 */
    public static final int CLOSED = 5;
    /** 退款中 */
    public static final int REFUNDING = 6;
    /** 退款完成 */
    public static final int REFUNDED = 7;

    private OrderStatus() {
    }

    public static String label(Integer status) {
        if (status == null) {
            return "未知状态";
        }
        return switch (status) {
            case PENDING_PAY -> "待付款";
            case PAID -> "待发货";
            case SHIPPED -> "待收货";
            case FINISHED -> "已完成";
            case CANCELED -> "已取消";
            case CLOSED -> "已关闭";
            case REFUNDING -> "退款中";
            case REFUNDED -> "退款完成";
            default -> "未知状态";
        };
    }

    /** 是否占用库存（取消 / 关闭 / 退款完成都需要回补） */
    public static boolean holdsStock(Integer status) {
        return status != null
                && (status == PENDING_PAY || status == PAID || status == SHIPPED || status == FINISHED);
    }

    /** 是否终态 */
    public static boolean isFinal(Integer status) {
        return status != null && (status == FINISHED || status == CANCELED || status == CLOSED
                || status == REFUNDED);
    }

    /**
     * 状态迁移是否允许。仅列出业务上合法的边，其余一律拒绝。
     */
    public static boolean canTransit(int from, int to) {
        return switch (from) {
            case PENDING_PAY -> to == PAID || to == CANCELED || to == CLOSED;
            case PAID -> to == SHIPPED || to == REFUNDING;
            case SHIPPED -> to == FINISHED || to == REFUNDING;
            case FINISHED -> to == REFUNDING;
            case REFUNDING -> to == REFUNDED || to == SHIPPED || to == FINISHED;
            default -> false;
        };
    }
}
