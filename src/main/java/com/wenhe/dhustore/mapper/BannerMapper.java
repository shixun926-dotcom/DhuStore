package com.wenhe.dhustore.mapper;

import com.wenhe.dhustore.entity.Banner;

import java.util.List;

public interface BannerMapper {

    /** 前台：仅启用的，按 sort 升序，最多 5 条 */
    List<Banner> findEnabled();

    /** 后台：全部记录 */
    List<Banner> findAll();

    Banner findById(Long id);

    int countAll();

    Integer maxSort();

    int insert(Banner banner);

    int updateImageUrl(Banner banner);

    int deleteById(Long id);
}
