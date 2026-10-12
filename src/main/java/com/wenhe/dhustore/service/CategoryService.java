package com.wenhe.dhustore.service;

import com.wenhe.dhustore.common.BusinessException;
import com.wenhe.dhustore.common.ResultCode;
import com.wenhe.dhustore.entity.Category;
import com.wenhe.dhustore.mapper.CategoryMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryMapper categoryMapper;

    public List<Category> list() {
        return categoryMapper.findAll();
    }

    public Category get(Long id) {
        Category category = categoryMapper.findById(id);
        if (category == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        return category;
    }
}
