package com.wenhe.dhustore.common;

import lombok.Getter;

/**
 * 业务状态码。200 成功；4xx 通用；1xxx 用户；2xxx 商品/购物车/订单。
 */
@Getter
public enum ResultCode {

    SUCCESS(200, "操作成功"),
    BAD_REQUEST(400, "参数错误"),
    UNAUTHORIZED(401, "未登录或登录已过期"),
    FORBIDDEN(403, "没有权限"),
    NOT_FOUND(404, "资源不存在"),
    SERVER_ERROR(500, "服务器内部错误"),

    USERNAME_EXISTS(1001, "用户名已存在"),
    USERNAME_OR_PASSWORD_ERROR(1002, "用户名或密码错误"),
    ACCOUNT_DISABLED(1003, "账号已被禁用"),

    STOCK_NOT_ENOUGH(2001, "商品库存不足"),
    CART_EMPTY(2002, "购物车为空"),
    ORDER_NOT_FOUND(2003, "订单不存在"),
    ORDER_STATUS_ERROR(2004, "订单状态不允许该操作");

    private final int code;
    private final String message;

    ResultCode(int code, String message) {
        this.code = code;
        this.message = message;
    }
}
