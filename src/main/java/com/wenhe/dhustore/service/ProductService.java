package com.wenhe.dhustore.service;

import com.wenhe.dhustore.common.BusinessException;
import com.wenhe.dhustore.common.PageResult;
import com.wenhe.dhustore.common.Paging;
import com.wenhe.dhustore.common.ResultCode;
import com.wenhe.dhustore.dto.ProductRequest;
import com.wenhe.dhustore.entity.Product;
import com.wenhe.dhustore.entity.ProductImage;
import com.wenhe.dhustore.mapper.CategoryMapper;
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
    private final CategoryMapper categoryMapper;

    public PageResult<Product> page(Long categoryId, String keyword, Integer status, int page, int size) {
        // 未显式指定状态时：管理员默认看全部，普通用户/游客默认只看在售
        Integer effectiveStatus = status;
        if (effectiveStatus == null) {
            effectiveStatus = (UserContext.getRole() != null && UserContext.getRole() == 1) ? null : 1;
        }
        int safePage = Paging.page(page);
        int safeSize = Paging.size(size);
        List<Product> list = productMapper.findList(categoryId, escapeLike(keyword), effectiveStatus,
                Paging.offset(safePage, safeSize), safeSize);
        long total = productMapper.countList(categoryId, escapeLike(keyword), effectiveStatus);
        return new PageResult<>(list, total, safePage, safeSize);
    }

    /**
     * 转义 LIKE 通配符：用户输入的 % 与 _ 按字面量匹配，
     * 否则搜索「%」会命中全表。转义符与 SQL 中的 ESCAPE 保持一致。
     */
    private String escapeLike(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return null;
        }
        return keyword.trim()
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
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
    public void create(ProductRequest req) {
        requireCategory(req.getCategoryId());
        Product product = toEntity(req);
        product.setSales(0);
        if (product.getStatus() == null) product.setStatus(1);

        List<String> images = cleanImages(req.getImages());
        if (!images.isEmpty()) {
            product.setMainImage(images.get(0));
        }
        productMapper.insert(product);
        saveImages(product.getId(), images);
    }

    @Transactional
    public void update(Long id, ProductRequest req) {
        if (productMapper.findById(id) == null) {
            throw new BusinessException(ResultCode.NOT_FOUND.getCode(), "商品不存在");
        }
        if (req.getCategoryId() != null) {
            requireCategory(req.getCategoryId());
        }
        Product product = toEntity(req);
        product.setId(id);
        List<String> images = req.getImages() == null ? null : cleanImages(req.getImages());
        if (images != null && !images.isEmpty()) {
            product.setMainImage(images.get(0));
        }
        productMapper.update(product);

        if (images != null) {
            productImageMapper.deleteByProductId(id);
            saveImages(id, images);
        }
    }

    /** 商品必须落在已存在的分类下，否则会留下无法被任何分类页检索到的孤儿数据 */
    private void requireCategory(Long categoryId) {
        if (categoryMapper.findById(categoryId) == null) {
            throw new BusinessException(ResultCode.BAD_REQUEST.getCode(), "所选分类不存在");
        }
    }

    private Product toEntity(ProductRequest req) {
        Product p = new Product();
        p.setCategoryId(req.getCategoryId());
        p.setSellerId(req.getSellerId());
        p.setName(req.getName() == null ? null : req.getName().trim());
        p.setSubtitle(req.getSubtitle());
        p.setMainImage(req.getMainImage());
        p.setSubImages(req.getSubImages());
        p.setDetail(req.getDetail());
        p.setPrice(req.getPrice());
        p.setStock(req.getStock());
        p.setStatus(req.getStatus());
        return p;
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
