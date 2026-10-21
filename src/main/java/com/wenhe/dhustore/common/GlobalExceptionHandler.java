package com.wenhe.dhustore.common;

import lombok.extern.slf4j.Slf4j;
import org.springframework.validation.BindException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

/**
 * 全局异常处理，统一返回 Result 结构。
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public Result<Void> handleBusiness(BusinessException e) {
        return Result.error(e.getCode(), e.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public Result<Void> handleValid(MethodArgumentNotValidException e) {
        return Result.error(ResultCode.BAD_REQUEST.getCode(), firstMessage(e.getBindingResult().getFieldError()));
    }

    @ExceptionHandler(BindException.class)
    public Result<Void> handleBind(BindException e) {
        return Result.error(ResultCode.BAD_REQUEST.getCode(), firstMessage(e.getBindingResult().getFieldError()));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public Result<Void> handleMaxUpload(MaxUploadSizeExceededException e) {
        return Result.error(ResultCode.FILE_TOO_LARGE);
    }

    @ExceptionHandler(Exception.class)
    public Result<Void> handleException(Exception e) {
        log.error("系统异常", e);
        return Result.error(ResultCode.SERVER_ERROR);
    }

    private String firstMessage(FieldError fieldError) {
        return fieldError == null ? ResultCode.BAD_REQUEST.getMessage() : fieldError.getDefaultMessage();
    }
}
