package com.wenhe.dhustore.mapper;

import com.wenhe.dhustore.entity.RefundRequest;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface RefundRequestMapper {

    int insert(RefundRequest request);

    RefundRequest findByRefundNo(@Param("refundNo") String refundNo);

    RefundRequest findProcessingByOrderNo(@Param("orderNo") String orderNo);

    List<RefundRequest> findByUserId(@Param("userId") Long userId);

    List<RefundRequest> findAll(@Param("status") Integer status);

    /** 审核：只处理待审核的申请 */
    int audit(@Param("refundNo") String refundNo, @Param("status") int status,
              @Param("remark") String remark);
}
