package com.wenhe.dhustore.service;

import com.wenhe.dhustore.common.BusinessException;
import com.wenhe.dhustore.common.ResultCode;
import com.wenhe.dhustore.dto.FlashSaleVO;
import com.wenhe.dhustore.entity.FlashSale;
import com.wenhe.dhustore.entity.Product;
import com.wenhe.dhustore.mapper.FlashSaleMapper;
import com.wenhe.dhustore.mapper.ProductMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 首页限时秒杀位配置。
 * 保存的是商品引用而非快照 —— 商品改价、库存变化、下架都会实时反映到首页。
 */
@Service
@RequiredArgsConstructor
public class FlashSaleService {

    /** 首页一屏最多展示 8 个秒杀位（4 列两行） */
    public static final int MAX_ITEMS = 8;

    private final FlashSaleMapper flashSaleMapper;
    private final ProductMapper productMapper;

    /** 前台：只含在售商品 */
    public List<FlashSaleVO> listActive() {
        return flashSaleMapper.findActiveVO();
    }

    /** 后台：含已下架商品，便于管理员发现并替换 */
    public List<FlashSaleVO> listAll() {
        return flashSaleMapper.findAllVO();
    }

    @Transactional
    public void add(Long productId) {
        Product product = requireOnSaleProduct(productId);
        if (flashSaleMapper.findByProductId(product.getId()) != null) {
            throw new BusinessException(ResultCode.FLASH_DUPLICATE);
        }
        int count = flashSaleMapper.countAll();
        if (count >= MAX_ITEMS) {
            throw new BusinessException(ResultCode.FLASH_LIMIT);
        }
        FlashSale sale = new FlashSale();
        sale.setProductId(product.getId());
        sale.setSort(count + 1);
        flashSaleMapper.insert(sale);
    }

    /** 替换：把某个秒杀位换成另一个商品，位置（sort）保持不变 */
    @Transactional
    public void replace(Long id, Long productId) {
        FlashSale sale = flashSaleMapper.findById(id);
        if (sale == null) {
            throw new BusinessException(ResultCode.NOT_FOUND.getCode(), "秒杀位不存在");
        }
        Product product = requireOnSaleProduct(productId);
        FlashSale duplicated = flashSaleMapper.findByProductId(product.getId());
        if (duplicated != null && !duplicated.getId().equals(id)) {
            throw new BusinessException(ResultCode.FLASH_DUPLICATE);
        }
        flashSaleMapper.updateProduct(id, product.getId());
    }

    @Transactional
    public void remove(Long id) {
        if (flashSaleMapper.findById(id) == null) {
            throw new BusinessException(ResultCode.NOT_FOUND.getCode(), "秒杀位不存在");
        }
        flashSaleMapper.deleteById(id);
    }

    private Product requireOnSaleProduct(Long productId) {
        if (productId == null) {
            throw new BusinessException(ResultCode.BAD_REQUEST.getCode(), "请选择商品");
        }
        Product product = productMapper.findById(productId);
        if (product == null) {
            throw new BusinessException(ResultCode.NOT_FOUND.getCode(), "商品不存在");
        }
        if (product.getStatus() == null || product.getStatus() != 1) {
            throw new BusinessException(ResultCode.BAD_REQUEST.getCode(), "只能添加在售商品");
        }
        return product;
    }
}
