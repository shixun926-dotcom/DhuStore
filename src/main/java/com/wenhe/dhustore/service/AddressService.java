package com.wenhe.dhustore.service;

import com.wenhe.dhustore.entity.Address;
import com.wenhe.dhustore.mapper.AddressMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AddressService {

    private final AddressMapper addressMapper;

    public List<Address> list(Long userId) {
        return addressMapper.findByUserId(userId);
    }

    public void add(Long userId, Address address) {
        address.setId(null);
        address.setUserId(userId);
        if (address.getIsDefault() == null) {
            address.setIsDefault(0);
        }
        if (address.getIsDefault() == 1) {
            addressMapper.clearDefault(userId);
        }
        addressMapper.insert(address);
    }

    public void update(Long userId, Long id, Address address) {
        address.setId(id);
        address.setUserId(userId);
        addressMapper.update(address);
    }

    public void delete(Long userId, Long id) {
        addressMapper.deleteById(id, userId);
    }

    public void setDefault(Long userId, Long id) {
        addressMapper.clearDefault(userId);
        addressMapper.setDefault(id, userId);
    }
}
