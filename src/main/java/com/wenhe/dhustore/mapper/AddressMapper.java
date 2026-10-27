package com.wenhe.dhustore.mapper;

import com.wenhe.dhustore.entity.Address;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface AddressMapper {

    Address findByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);

    List<Address> findByUserId(Long userId);

    int countByUserId(Long userId);

    int insert(Address address);

    int update(Address address);

    int deleteById(@Param("id") Long id, @Param("userId") Long userId);

    int clearDefault(Long userId);

    int setDefault(@Param("id") Long id, @Param("userId") Long userId);
}
