package com.wenhe.dhustore.service;

import com.wenhe.dhustore.common.BusinessException;
import com.wenhe.dhustore.common.ResultCode;
import com.wenhe.dhustore.dto.CartItemVO;
import com.wenhe.dhustore.entity.CartItem;
import com.wenhe.dhustore.entity.Product;
import com.wenhe.dhustore.mapper.CartItemMapper;
import com.wenhe.dhustore.mapper.ProductMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;

/**
 * 购物车。
 *
 * 两条一致性约定：
 * 1. 写入前一律校验商品可售性（存在、在售、有库存），不依赖前端限制；
 * 2. 新增走原子 upsert（依赖 uk_user_product 唯一键），并发/连点不会产生重复行。
 */
@Service
@RequiredArgsConstructor
public class CartService {

    /** 购物车商品种类上限 */
    private static final int MAX_CART_ITEMS = 100;
    /** 单个商品数量上限，与订单侧保持一致 */
    private static final int MAX_QUANTITY = 999;
    /** 单次批量操作条目上限 */
    private static final int MAX_BATCH = 100;

    private final CartItemMapper cartItemMapper;
    private final ProductMapper productMapper;

    public List<CartItemVO> list(Long userId) {
        return cartItemMapper.findCartItemVOsByUserId(userId);
    }

    /**
     * 加入购物车。同一商品已存在则累加数量，并由库存封顶。
     *
     * @return 该商品在购物车中的最终数量，供前端提示「已达上限」
     */
    @Transactional
    public int add(Long userId, Long productId, Integer quantity) {
        Product product = productMapper.findById(productId);
        if (product == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        if (product.getStatus() == null || product.getStatus() != 1) {
            throw new BusinessException(ResultCode.PRODUCT_UNAVAILABLE.getCode(), "商品已下架");
        }
        int stock = product.getStock() == null ? 0 : product.getStock();
        if (stock <= 0) {
            throw new BusinessException(ResultCode.PRODUCT_UNAVAILABLE.getCode(), "商品库存不足");
        }

        int max = Math.min(stock, MAX_QUANTITY);
        int want = normalize(quantity, 1, max);

        /* 新增行时校验种类上限；已在购物车中的商品累加不受此限 */
        boolean exists = cartItemMapper.findByUserIdAndProductId(userId, productId) != null;
        if (!exists && cartItemMapper.countByUserId(userId) >= MAX_CART_ITEMS) {
            throw new BusinessException(ResultCode.CART_ITEM_LIMIT);
        }

        cartItemMapper.upsert(userId, productId, want, max);
        CartItem merged = cartItemMapper.findByUserIdAndProductId(userId, productId);
        return merged == null ? want : merged.getQuantity();
    }

    /**
     * 修改数量或勾选状态。购物车项不存在或不属于当前用户时抛 2016，不再静默成功。
     */
    public void update(Long userId, Long id, Integer quantity, Integer checked) {
        CartItem item = cartItemMapper.findByIdAndUserId(id, userId);
        if (item == null) {
            throw new BusinessException(ResultCode.CART_ITEM_NOT_FOUND);
        }
        Integer qty = null;
        if (quantity != null) {
            Product product = productMapper.findById(item.getProductId());
            int stock = product == null || product.getStock() == null ? 0 : product.getStock();
            if (stock <= 0) {
                throw new BusinessException(ResultCode.PRODUCT_UNAVAILABLE.getCode(),
                        product == null ? "商品已下架" : "「" + product.getName() + "」库存不足");
            }
            qty = normalize(quantity, 1, Math.min(stock, MAX_QUANTITY));
        }
        Integer flag = checked == null ? null : (checked != null && checked == 1 ? 1 : 0);
        if (cartItemMapper.update(id, userId, qty, flag) == 0) {
            throw new BusinessException(ResultCode.CART_ITEM_NOT_FOUND);
        }
    }

    public void delete(Long userId, Long id) {
        if (cartItemMapper.deleteById(id, userId) == 0) {
            throw new BusinessException(ResultCode.CART_ITEM_NOT_FOUND);
        }
    }

    /** 批量删除（「删除选中」走这里，一次往返替代 N 次请求） */
    @Transactional
    public int deleteBatch(Long userId, List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            throw new BusinessException(ResultCode.BAD_REQUEST.getCode(), "请选择要删除的商品");
        }
        if (ids.size() > MAX_BATCH) {
            throw new BusinessException(ResultCode.BAD_REQUEST.getCode(), "单次最多操作 " + MAX_BATCH + " 项");
        }
        List<Long> distinct = new LinkedHashSet<>(ids).stream()
                .filter(java.util.Objects::nonNull)
                .toList();
        return distinct.isEmpty() ? 0 : cartItemMapper.deleteByIds(userId, distinct);
    }

    /**
     * 全选 / 全不选：先全部置 0，再把可售行置为目标值。
     * 这样失效行不会残留 checked=1，全选后直接结算不会被失效商品阻断。
     */
    @Transactional
    public int setAllChecked(Long userId, Integer checked) {
        int flag = checked != null && checked == 1 ? 1 : 0;
        cartItemMapper.clearAllChecked(userId);
        if (flag == 1) {
            return cartItemMapper.updateAllChecked(userId, 1);
        }
        return 0;
    }

    /** 一键清理失效商品（已下架 / 已删除 / 无库存） */
    public int clearUnavailable(Long userId) {
        return cartItemMapper.deleteUnavailable(userId);
    }

    private int normalize(Integer v, int min, int max) {
        int n = v == null ? min : v;
        if (n < min) {
            n = min;
        }
        return Math.min(n, max);
    }
}
