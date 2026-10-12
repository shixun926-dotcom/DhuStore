package com.wenhe.dhustore;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("com.wenhe.dhustore.mapper")
public class DhuStoreApplication {

    public static void main(String[] args) {
        SpringApplication.run(DhuStoreApplication.class, args);
    }

}
