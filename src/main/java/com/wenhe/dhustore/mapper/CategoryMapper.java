package com.wenhe.dhustore.mapper;

import com.wenhe.dhustore.entity.Category;

import java.util.List;

public interface CategoryMapper {

    List<Category> findAll();

    Category findById(Long id);

    int insert(Category category);

    int update(Category category);

    int deleteById(Long id);
}
