package com.wenhe.dhustore.service;

import com.wenhe.dhustore.common.BusinessException;
import com.wenhe.dhustore.common.ResultCode;
import com.wenhe.dhustore.entity.Banner;
import com.wenhe.dhustore.mapper.BannerMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 首页轮播图。上限 5 张，由管理员维护；前台只取启用状态并按 sort 排序。
 */
@Service
@RequiredArgsConstructor
public class BannerService {

    /** 轮播位上限定：与首页占位槽位数保持一致 */
    public static final int MAX_BANNERS = 5;

    private final BannerMapper bannerMapper;

    public List<Banner> listPublic() {
        return bannerMapper.findEnabled();
    }

    public List<Banner> listAll() {
        return bannerMapper.findAll();
    }

    @Transactional
    public Banner create(String imageUrl) {
        if (bannerMapper.countAll() >= MAX_BANNERS) {
            throw new BusinessException(ResultCode.BANNER_LIMIT);
        }
        Banner banner = new Banner();
        banner.setImageUrl(imageUrl);
        banner.setStatus(1);
        Integer max = bannerMapper.maxSort();
        banner.setSort((max == null ? 0 : max) + 1);
        bannerMapper.insert(banner);
        return bannerMapper.findById(banner.getId());
    }

    @Transactional
    public void replaceImage(Long id, String imageUrl) {
        Banner banner = bannerMapper.findById(id);
        if (banner == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        Banner patch = new Banner();
        patch.setId(id);
        patch.setImageUrl(imageUrl);
        bannerMapper.updateImageUrl(patch);
    }

    @Transactional
    public void delete(Long id) {
        if (bannerMapper.findById(id) == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        bannerMapper.deleteById(id);
    }
}
