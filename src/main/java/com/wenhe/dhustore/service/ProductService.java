package com.wenhe.dhustore.service;

import com.wenhe.dhustore.common.BusinessException;
import com.wenhe.dhustore.common.PageResult;
import com.wenhe.dhustore.common.ResultCode;
import com.wenhe.dhustore.entity.Product;
import com.wenhe.dhustore.entity.ProductImage;
import com.wenhe.dhustore.mapper.ProductImageMapper;
import com.wenhe.dhustore.mapper.ProductMapper;
import com.wenhe.dhustore.util.UserContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductMapper productMapper;
    private final ProductImageMapper productImageMapper;

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
        fillImages(product);
        return product;
    }

    @Transactional
    public void create(Product product) {
        if (product.getSales() == null) product.setSales(0);
        if (product.getStock() == null) product.setStock(0);
        if (product.getStatus() == null) product.setStatus(1);

        List<String> images = cleanImages(product.getImages());
        if (!images.isEmpty()) {
            product.setMainImage(images.get(0));
        }
        productMapper.insert(product);
        saveImages(product.getId(), images);
    }

    @Transactional
    public void update(Long id, Product product) {
        product.setId(id);
        List<String> images = product.getImages() == null ? null : cleanImages(product.getImages());
        if (images != null && !images.isEmpty()) {
            product.setMainImage(images.get(0));
        }
        productMapper.update(product);

        if (images != null) {
            productImageMapper.deleteByProductId(id);
            saveImages(id, images);
        }
    }

    public void delete(Long id) {
        productImageMapper.deleteByProductId(id);
        productMapper.deleteById(id);
    }

    private void saveImages(Long productId, List<String> images) {
        if (images == null || images.isEmpty()) {
            return;
        }
        List<ProductImage> items = new ArrayList<>();
        for (int i = 0; i < images.size(); i++) {
            ProductImage img = new ProductImage();
            img.setProductId(productId);
            img.setImageUrl(images.get(i));
            img.setSort(i + 1);
            items.add(img);
        }
        productImageMapper.batchInsert(items);
    }

    private void fillImages(Product product) {
        List<String> urls = productImageMapper.findByProductId(product.getId()).stream()
                .map(ProductImage::getImageUrl)
                .collect(Collectors.toList());
        if (urls.isEmpty() && product.getMainImage() != null && !product.getMainImage().isBlank()) {
            urls = new ArrayList<>(List.of(product.getMainImage()));
        }
        product.setImages(urls);
    }

    private List<String> cleanImages(List<String> images) {
        if (images == null) {
            return new ArrayList<>();
        }
        return images.stream()
                .filter(u -> u != null && !u.isBlank())
                .map(String::trim)
                .distinct()
                .collect(Collectors.toList());
    }
}
