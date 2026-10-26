package com.wenhe.dhustore.mapper;

import com.wenhe.dhustore.entity.Category;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface CategoryMapper {

    List<Category> findAll();

    /** 后台用：带商品数量 */
    List<Category> findAllWithCount();

    /** 前台列表：只统计在售商品数，用于首页分类卡的实数副行 */
    List<Category> findAllWithOnlineCount();

    Category findById(Long id);

    /** 同名分类计数，用于新增/改名时的重名校验 */
    int countByName(@Param("name") String name, @Param("excludeId") Long excludeId);

    int insert(Category category);

    int update(Category category);

    int deleteById(Long id);
}
