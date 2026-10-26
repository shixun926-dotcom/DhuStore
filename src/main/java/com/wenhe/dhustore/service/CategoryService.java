package com.wenhe.dhustore.service;

import com.wenhe.dhustore.common.BusinessException;
import com.wenhe.dhustore.common.ResultCode;
import com.wenhe.dhustore.dto.CategoryRequest;
import com.wenhe.dhustore.entity.Category;
import com.wenhe.dhustore.mapper.CategoryMapper;
import com.wenhe.dhustore.mapper.ProductMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryMapper categoryMapper;
    private final ProductMapper productMapper;

    /** 前台列表：带每个分类的在售商品数，供首页分类卡展示真实数量 */
    public List<Category> list() {
        return categoryMapper.findAllWithOnlineCount();
    }

    /** 后台列表：带每个分类的商品数量，便于判断能否删除 */
    public List<Category> listWithCount() {
        return categoryMapper.findAllWithCount();
    }

    public Category get(Long id) {
        Category category = categoryMapper.findById(id);
        if (category == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        return category;
    }

    @Transactional
    public Category create(CategoryRequest req) {
        String name = req.getName().trim();
        if (categoryMapper.countByName(name, null) > 0) {
            throw new BusinessException(ResultCode.CATEGORY_NAME_EXISTS);
        }
        Category category = new Category();
        category.setName(name);
        category.setParentId(req.getParentId() == null ? 0L : req.getParentId());
        category.setSort(req.getSort() == null ? 0 : req.getSort());
        category.setStatus(req.getStatus() == null ? 1 : req.getStatus());
        category.setIcon(normalizeIcon(req.getIcon()));
        categoryMapper.insert(category);
        return categoryMapper.findById(category.getId());
    }

    @Transactional
    public Category update(Long id, CategoryRequest req) {
        Category category = categoryMapper.findById(id);
        if (category == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        String name = req.getName().trim();
        if (categoryMapper.countByName(name, id) > 0) {
            throw new BusinessException(ResultCode.CATEGORY_NAME_EXISTS);
        }
        category.setName(name);
        if (req.getParentId() != null) category.setParentId(req.getParentId());
        if (req.getSort() != null) category.setSort(req.getSort());
        if (req.getStatus() != null) category.setStatus(req.getStatus());
        /* icon 显式传空串表示清除图标，传 null 表示不改动 */
        if (req.getIcon() != null) category.setIcon(normalizeIcon(req.getIcon()));
        categoryMapper.update(category);
        return categoryMapper.findById(id);
    }

    /**
     * 删除分类：先校验该分类下没有任何商品（含下架商品），有则直接阻止。
     * 商品与分类是强关联数据，删除分类会造成商品落入"无分类"状态，因此不做级联。
     */
    @Transactional
    public void delete(Long id) {
        Category category = categoryMapper.findById(id);
        if (category == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        long used = productMapper.countByCategory(id);
        if (used > 0) {
            throw new BusinessException(ResultCode.CATEGORY_NOT_EMPTY.getCode(),
                    "该分类下还有 " + used + " 件商品，请先将商品移到其他分类或删除后再试");
        }
        categoryMapper.deleteById(id);
    }

    private String normalizeIcon(String icon) {
        if (icon == null) return null;
        String trimmed = icon.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
