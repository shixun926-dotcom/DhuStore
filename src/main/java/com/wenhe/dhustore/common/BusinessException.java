package com.wenhe.dhustore.common;

import lombok.Getter;

/**
 * 业务异常，由 GlobalExceptionHandler 统一捕获并转换为响应体。
 */
@Getter
public class BusinessException extends RuntimeException {

    private final int code;

    public BusinessException(ResultCode resultCode) {
        super(resultCode.getMessage());
        this.code = resultCode.getCode();
    }

    public BusinessException(int code, String message) {
        super(message);
        this.code = code;
    }
}
