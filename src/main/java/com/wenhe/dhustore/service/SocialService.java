package com.wenhe.dhustore.service;

import com.wenhe.dhustore.common.BusinessException;
import com.wenhe.dhustore.common.PageResult;
import com.wenhe.dhustore.common.ResultCode;
import com.wenhe.dhustore.dto.FollowUserVO;
import com.wenhe.dhustore.dto.PublicUserVO;
import com.wenhe.dhustore.dto.SellerVO;
import com.wenhe.dhustore.entity.Follow;
import com.wenhe.dhustore.entity.Product;
import com.wenhe.dhustore.entity.User;
import com.wenhe.dhustore.mapper.FollowMapper;
import com.wenhe.dhustore.mapper.ProductMapper;
import com.wenhe.dhustore.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 社交关系：关注 / 取消关注 / 关注与粉丝列表 / 公开用户资料 / 商品发布者摘要。
 * 关注与粉丝数实时 COUNT，当前量级下无需冗余计数字段。
 */
@Service
@RequiredArgsConstructor
public class SocialService {

    private final FollowMapper followMapper;
    private final UserMapper userMapper;
    private final ProductMapper productMapper;

    /** 关注。幂等：已关注时不报错，直接返回成功 */
    @Transactional
    public void follow(Long meId, Long targetId) {
        requireLogin(meId);
        if (targetId == null || meId.equals(targetId)) {
            throw new BusinessException(ResultCode.FOLLOW_SELF);
        }
        if (userMapper.findById(targetId) == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        if (followMapper.countRelation(meId, targetId) > 0) {
            return;
        }
        Follow follow = new Follow();
        follow.setFollowerId(meId);
        follow.setFolloweeId(targetId);
        try {
            followMapper.insert(follow);
        } catch (DuplicateKeyException e) {
            // 并发重复关注撞唯一键，视为已关注
        }
    }

    /** 取消关注。幂等：未关注时同样返回成功 */
    @Transactional
    public void unfollow(Long meId, Long targetId) {
        requireLogin(meId);
        if (targetId == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        followMapper.delete(meId, targetId);
    }

    public PageResult<FollowUserVO> following(Long userId, int page, int size) {
        int offset = (page - 1) * size;
        List<FollowUserVO> list = followMapper.findFollowing(userId, offset, size);
        return new PageResult<>(list, followMapper.countFollowing(userId), page, size);
    }

    public PageResult<FollowUserVO> followers(Long userId, int page, int size) {
        int offset = (page - 1) * size;
        List<FollowUserVO> list = followMapper.findFollowers(userId, offset, size);
        return new PageResult<>(list, followMapper.countFollowers(userId), page, size);
    }

    /** 关注数 / 粉丝数，供个人中心身份卡展示 */
    public Map<String, Long> stats(Long userId) {
        Map<String, Long> m = new LinkedHashMap<>();
        m.put("following", followMapper.countFollowing(userId));
        m.put("followers", followMapper.countFollowers(userId));
        return m;
    }

    /** 公开资料：不含手机号与邮箱；meId 可为空（未登录） */
    public PublicUserVO profile(Long targetId, Long meId) {
        User user = targetId == null ? null : userMapper.findById(targetId);
        if (user == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        PublicUserVO vo = new PublicUserVO();
        vo.setId(user.getId());
        vo.setUsername(user.getUsername());
        vo.setNickname(displayName(user));
        vo.setAvatar(user.getAvatar());
        vo.setRole(user.getRole());
        vo.setFollowingCount(followMapper.countFollowing(user.getId()));
        vo.setFollowerCount(followMapper.countFollowers(user.getId()));
        vo.setSelf(meId != null && meId.equals(user.getId()));
        vo.setFollowing(meId != null && !vo.getSelf()
                && followMapper.countRelation(meId, user.getId()) > 0);
        return vo;
    }

    /**
     * 商品发布者摘要。
     * seller_id 为空视为平台自营：不提供关注与私信按钮，但下发官方客服账号，
     * 由前端把整张卡片做成「前往会话」的入口。
     */
    public SellerVO sellerOfProduct(Long productId, Long meId) {
        Product product = productMapper.findById(productId);
        if (product == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        User seller = product.getSellerId() == null ? null : userMapper.findById(product.getSellerId());
        SellerVO vo = new SellerVO();
        if (seller == null) {
            User official = userMapper.findPlatformAccount();
            vo.setPlatform(true);
            vo.setNickname("东华自营");
            vo.setFollowing(false);
            vo.setSelf(meId != null && official != null && meId.equals(official.getId()));
            vo.setFollowerCount(0L);
            /* 没有可用管理员账号时保持为空，前端据此提示而非跳转 */
            vo.setServiceUserId(official == null ? null : official.getId());
            return vo;
        }
        vo.setPlatform(false);
        vo.setId(seller.getId());
        vo.setNickname(displayName(seller));
        vo.setAvatar(seller.getAvatar());
        vo.setRole(seller.getRole());
        vo.setFollowerCount(followMapper.countFollowers(seller.getId()));
        vo.setSelf(meId != null && meId.equals(seller.getId()));
        vo.setFollowing(meId != null && !vo.getSelf()
                && followMapper.countRelation(meId, seller.getId()) > 0);
        return vo;
    }

    private String displayName(User user) {
        return user.getNickname() == null || user.getNickname().isBlank()
                ? user.getUsername() : user.getNickname();
    }

    private void requireLogin(Long meId) {
        if (meId == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
    }
}
