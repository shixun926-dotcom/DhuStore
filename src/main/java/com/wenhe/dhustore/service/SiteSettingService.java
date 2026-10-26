package com.wenhe.dhustore.service;

import com.wenhe.dhustore.mapper.SiteSettingMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 站点配置读写。目前承载首页两个促销位（全部商品 / 新人礼包）的图片地址。
 * 用键值表而非建独立表：这类运营位数量固定、每项只有一个图片地址，扩展新位置只需加一个 key。
 */
@Service
@RequiredArgsConstructor
public class SiteSettingService {

    /** 全部商品促销位图片 */
    public static final String KEY_PROMO_ALL = "promo_all_image";
    /** 新人礼包促销位图片 */
    public static final String KEY_PROMO_NEW = "promo_new_image";

    private final SiteSettingMapper siteSettingMapper;

    public String get(String key) {
        var setting = siteSettingMapper.findByKey(key);
        return setting == null || setting.getSettingValue() == null ? "" : setting.getSettingValue();
    }

    @Transactional
    public void put(String key, String value) {
        siteSettingMapper.upsert(key, value == null ? "" : value.trim());
    }

    /** 前台读取：返回两个位置的图片地址，未配置时为空串 */
    public Map<String, String> promos() {
        Map<String, String> map = new LinkedHashMap<>();
        map.put("all", get(KEY_PROMO_ALL));
        map.put("newUser", get(KEY_PROMO_NEW));
        return map;
    }

    @Transactional
    public void savePromos(String all, String newUser) {
        put(KEY_PROMO_ALL, all);
        put(KEY_PROMO_NEW, newUser);
    }
}
