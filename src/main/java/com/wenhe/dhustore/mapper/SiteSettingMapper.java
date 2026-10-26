package com.wenhe.dhustore.mapper;

import com.wenhe.dhustore.entity.SiteSetting;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface SiteSettingMapper {

    List<SiteSetting> findAll();

    SiteSetting findByKey(@Param("key") String key);

    /** 存在则更新、不存在则插入，避免并发下的先查后写竞态 */
    int upsert(@Param("key") String key, @Param("value") String value);
}
