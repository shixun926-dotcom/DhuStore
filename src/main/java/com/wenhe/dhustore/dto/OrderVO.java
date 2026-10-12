package com.wenhe.dhustore.dto;

import com.wenhe.dhustore.entity.OrderItem;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 订单展示对象。
 */
@Data
public class OrderVO {

    private Long id;
    private String orderNo;
    private BigDecimal totalPrice;
    private Integer payment;
    private Integer status;
    private String receiverName;
    private String receiverPhone;
    private String receiverAddress;
    private String remark;
    private LocalDateTime paymentTime;
    private LocalDateTime createTime;
    private List<OrderItem> items;
}
