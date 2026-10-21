package com.wenhe.dhustore.service;

import com.wenhe.dhustore.common.BusinessException;
import com.wenhe.dhustore.common.ResultCode;
import com.wenhe.dhustore.dto.ProductApplyDTO;
import com.wenhe.dhustore.entity.Product;
import com.wenhe.dhustore.entity.ProductApply;
import com.wenhe.dhustore.entity.ProductApplyImage;
import com.wenhe.dhustore.entity.ProductImage;
import com.wenhe.dhustore.mapper.ProductApplyImageMapper;
import com.wenhe.dhustore.mapper.ProductApplyMapper;
import com.wenhe.dhustore.mapper.ProductImageMapper;
import com.wenhe.dhustore.mapper.ProductMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 商品发布申请：用户提交 → 管理员审核（通过则事务内创建正式商品并复制图片）。
 */
@Service
@RequiredArgsConstructor
public class ProductApplyService {

    private final ProductApplyMapper productApplyMapper;
    private final ProductApplyImageMapper productApplyImageMapper;
    private final ProductMapper productMapper;
    private final ProductImageMapper productImageMapper;

    /** 用户提交发布申请（只写入申请表与图片表，不直接创建商品） */
    @Transactional
    public void apply(Long userId, ProductApplyDTO dto) {
        List<String> images = cleanImages(dto.getImages());
        if (images.isEmpty() || images.size() > 9) {
            throw new BusinessException(ResultCode.IMAGE_COUNT_ERROR);
        }

        ProductApply apply = new ProductApply();
        apply.setUserId(userId);
        apply.setCategoryId(dto.getCategoryId());
        apply.setName(dto.getName());
        apply.setPrice(dto.getPrice());
        apply.setStock(dto.getStock());
        apply.setDescription(dto.getDescription());
        apply.setImage(images.get(0));
        apply.setStatus(0);
        productApplyMapper.insert(apply);

        saveApplyImages(apply.getId(), images);
    }

    public List<ProductApply> myList(Long userId) {
        return fillImages(productApplyMapper.findByUserId(userId));
    }

    public List<ProductApply> adminList(Integer status) {
        return fillImages(productApplyMapper.findAll(status));
    }

    /** 审核通过：改申请状态 + 创建正式商品 + 复制图片，事务保证一致性 */
    @Transactional
    public void approve(Long applyId, Long adminId) {
        ProductApply apply = productApplyMapper.findById(applyId);
        if (apply == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        if (apply.getStatus() != 0) {
            throw new BusinessException(ResultCode.APPLY_ALREADY_AUDITED);
        }

        apply.setStatus(1);
        apply.setAuditorId(adminId);
        apply.setAuditTime(LocalDateTime.now());
        productApplyMapper.update(apply);

        List<ProductApplyImage> applyImages = productApplyImageMapper.findByApplyId(applyId);
        String mainImage = applyImages.isEmpty() ? apply.getImage()
                : applyImages.get(0).getImageUrl();

        Product product = new Product();
        product.setCategoryId(apply.getCategoryId());
        product.setSellerId(apply.getUserId());
        product.setName(apply.getName());
        product.setPrice(apply.getPrice());
        product.setStock(apply.getStock());
        product.setDetail(apply.getDescription());
        product.setMainImage(mainImage);
        product.setStatus(1);
        product.setSales(0);
        productMapper.insert(product);

        if (!applyImages.isEmpty()) {
            List<ProductImage> items = new ArrayList<>();
            for (int i = 0; i < applyImages.size(); i++) {
                ProductImage pi = new ProductImage();
                pi.setProductId(product.getId());
                pi.setImageUrl(applyImages.get(i).getImageUrl());
                pi.setSort(i + 1);
                items.add(pi);
            }
            productImageMapper.batchInsert(items);
        }
    }

    /** 审核拒绝：记录拒绝原因 */
    @Transactional
    public void reject(Long applyId, Long adminId, String reason) {
        ProductApply apply = productApplyMapper.findById(applyId);
        if (apply == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        if (apply.getStatus() != 0) {
            throw new BusinessException(ResultCode.APPLY_ALREADY_AUDITED);
        }

        apply.setStatus(2);
        apply.setRejectReason(reason);
        apply.setAuditorId(adminId);
        apply.setAuditTime(LocalDateTime.now());
        productApplyMapper.update(apply);
    }

    private void saveApplyImages(Long applyId, List<String> images) {
        List<ProductApplyImage> items = new ArrayList<>();
        for (int i = 0; i < images.size(); i++) {
            ProductApplyImage img = new ProductApplyImage();
            img.setApplyId(applyId);
            img.setImageUrl(images.get(i));
            img.setSort(i + 1);
            items.add(img);
        }
        productApplyImageMapper.batchInsert(items);
    }

    /** 批量填充图片，避免 N+1 查询 */
    private List<ProductApply> fillImages(List<ProductApply> applies) {
        if (applies == null || applies.isEmpty()) {
            return applies;
        }
        List<Long> ids = applies.stream().map(ProductApply::getId).collect(Collectors.toList());
        Map<Long, List<String>> byApply = new LinkedHashMap<>();
        for (ProductApplyImage img : productApplyImageMapper.findByApplyIds(ids)) {
            byApply.computeIfAbsent(img.getApplyId(), k -> new ArrayList<>()).add(img.getImageUrl());
        }
        for (ProductApply apply : applies) {
            List<String> urls = byApply.get(apply.getId());
            if (urls == null || urls.isEmpty()) {
                urls = apply.getImage() == null || apply.getImage().isBlank()
                        ? new ArrayList<>() : new ArrayList<>(List.of(apply.getImage()));
            }
            apply.setImages(urls);
        }
        return applies;
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
