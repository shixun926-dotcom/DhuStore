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

import java.util.List;

@Service
@RequiredArgsConstructor
public class CartService {

    private final CartItemMapper cartItemMapper;
    private final ProductMapper productMapper;

    public List<CartItemVO> list(Long userId) {
        return cartItemMapper.findCartItemVOsByUserId(userId);
    }

    public void add(Long userId, Long productId, Integer quantity) {
        Product product = productMapper.findById(productId);
        if (product == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        CartItem existing = cartItemMapper.findByUserIdAndProductId(userId, productId);
        if (existing != null) {
            cartItemMapper.update(existing.getId(), userId, existing.getQuantity() + quantity, null);
        } else {
            CartItem item = new CartItem();
            item.setUserId(userId);
            item.setProductId(productId);
            item.setQuantity(quantity);
            item.setChecked(1);
            cartItemMapper.insert(item);
        }
    }

    public void update(Long userId, Long id, Integer quantity, Integer checked) {
        cartItemMapper.update(id, userId, quantity, checked);
    }

    public void delete(Long userId, Long id) {
        cartItemMapper.deleteById(id, userId);
    }
}
