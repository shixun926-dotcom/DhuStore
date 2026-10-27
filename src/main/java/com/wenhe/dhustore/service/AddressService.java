package com.wenhe.dhustore.service;

import com.wenhe.dhustore.common.BusinessException;
import com.wenhe.dhustore.common.ResultCode;
import com.wenhe.dhustore.entity.Address;
import com.wenhe.dhustore.mapper.AddressMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 收货地址。
 *
 * <p>与购物车、订单一致的两条约定：
 * <ul>
 *   <li>写操作校验影响行数，越权或不存在一律 {@code 2019}，不静默成功；</li>
 *   <li>「清默认 + 写自己」这类多步操作放在事务内，避免中途失败留下无默认地址的状态。</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class AddressService {

    /** 单个账号的地址数量上限，防止误操作或脚本堆积 */
    private static final int MAX_ADDRESS = 20;

    private final AddressMapper addressMapper;

    public List<Address> list(Long userId) {
        return addressMapper.findByUserId(userId);
    }

    @Transactional
    public void add(Long userId, Address address) {
        int count = addressMapper.countByUserId(userId);
        if (count >= MAX_ADDRESS) {
            throw new BusinessException(ResultCode.ADDRESS_LIMIT);
        }
        address.setId(null);
        address.setUserId(userId);
        if (address.getIsDefault() == null) {
            address.setIsDefault(0);
        }
        /* 首个地址自动设为默认，避免用户下单时无默认地址可选 */
        if (count == 0) {
            address.setIsDefault(1);
        }
        if (address.getIsDefault() == 1) {
            addressMapper.clearDefault(userId);
        }
        addressMapper.insert(address);
    }

    @Transactional
    public void update(Long userId, Long id, Address address) {
        if (addressMapper.findByIdAndUserId(id, userId) == null) {
            throw new BusinessException(ResultCode.ADDRESS_NOT_FOUND);
        }
        address.setId(id);
        address.setUserId(userId);
        if (addressMapper.update(address) == 0) {
            throw new BusinessException(ResultCode.ADDRESS_NOT_FOUND);
        }
        /* 编辑时可顺带切换默认地址；取消默认请走 setDefault，避免出现「零默认」 */
        if (address.getIsDefault() != null && address.getIsDefault() == 1) {
            addressMapper.clearDefault(userId);
            addressMapper.setDefault(id, userId);
        }
    }

    public void delete(Long userId, Long id) {
        if (addressMapper.deleteById(id, userId) == 0) {
            throw new BusinessException(ResultCode.ADDRESS_NOT_FOUND);
        }
    }

    @Transactional
    public void setDefault(Long userId, Long id) {
        if (addressMapper.findByIdAndUserId(id, userId) == null) {
            throw new BusinessException(ResultCode.ADDRESS_NOT_FOUND);
        }
        addressMapper.clearDefault(userId);
        addressMapper.setDefault(id, userId);
    }
}
