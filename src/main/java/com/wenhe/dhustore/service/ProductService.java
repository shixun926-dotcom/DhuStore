package com.wenhe.dhustore.service;

import com.wenhe.dhustore.common.BusinessException;
import com.wenhe.dhustore.common.PageResult;
import com.wenhe.dhustore.common.ResultCode;
import com.wenhe.dhustore.entity.Product;
import com.wenhe.dhustore.mapper.ProductMapper;
import com.wenhe.dhustore.util.UserContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductMapper productMapper;

    public PageResult<Product> page(Long categoryId, String keyword, Integer status, int page, int size) {
        // 未显式指定状态时：管理员默认看全部，普通用户/游客默认只看在售
        Integer effectiveStatus = status;
        if (effectiveStatus == null) {
            effectiveStatus = (UserContext.getRole() != null && UserContext.getRole() == 1) ? null : 1;
        }
        int offset = (page - 1) * size;
        List<Product> list = productMapper.findList(categoryId, keyword, effectiveStatus, offset, size);
        long total = productMapper.countList(categoryId, keyword, effectiveStatus);
        return new PageResult<>(list, total, page, size);
    }

    public Product get(Long id) {
        Product product = productMapper.findById(id);
        if (product == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        return product;
    }

    public void create(Product product) {
        if (product.getSales() == null) product.setSales(0);
        if (product.getStock() == null) product.setStock(0);
        if (product.getStatus() == null) product.setStatus(1);
        productMapper.insert(product);
    }

    public void update(Long id, Product product) {
        product.setId(id);
        productMapper.update(product);
    }

    public void delete(Long id) {
        productMapper.deleteById(id);
    }
}
