package com.wenhe.dhustore.common;

/**
 * 分页参数规范化。
 *
 * <p>所有列表接口的 page / size 都应经此收敛，原因有三：
 * <ul>
 *   <li>page 传 0 或负数会产生负 offset，部分数据库直接报语法/参数错误；</li>
 *   <li>size 过大等价于全表扫描，是常见的拖库式误用；</li>
 *   <li>各接口各自 <code>(page - 1) * size</code> 手算，容易出现口径不一致。</li>
 * </ul>
 */
public final class Paging {

    /** 默认页码 */
    public static final int DEFAULT_PAGE = 1;
    /** 列表默认每页条数 */
    public static final int DEFAULT_SIZE = 10;
    /** 列表每页上限 */
    public static final int MAX_SIZE = 50;
    /** 消息流每页上限（比列表宽松，用于上滑加载历史） */
    public static final int MAX_MESSAGE_SIZE = 100;

    private Paging() {
    }

    /** 页码下限收敛到 1 */
    public static int page(Integer page) {
        return page == null || page < DEFAULT_PAGE ? DEFAULT_PAGE : page;
    }

    /** 每页条数收敛到 [1, max]，非法值回落为默认值 */
    public static int size(Integer size, int fallback, int max) {
        if (size == null || size < 1) {
            return fallback;
        }
        return Math.min(size, max);
    }

    /** 列表每页条数，使用统一默认值与上限 */
    public static int size(Integer size) {
        return size(size, DEFAULT_SIZE, MAX_SIZE);
    }

    /** 由已规范化的 page / size 计算 offset */
    public static int offset(int page, int size) {
        return (page - 1) * size;
    }
}
