package com.wenhe.dhustore.common;

import lombok.Getter;

import java.util.List;

/**
 * 分页结果封装。
 */
@Getter
public class PageResult<T> {

    private final List<T> list;
    private final long total;
    private final int page;
    private final int size;
    private final int totalPages;

    public PageResult(List<T> list, long total, int page, int size) {
        this.list = list;
        this.total = total;
        this.page = page;
        this.size = size;
        this.totalPages = size <= 0 ? 0 : (int) Math.ceil((double) total / size);
    }
}
