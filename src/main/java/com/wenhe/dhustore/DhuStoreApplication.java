package com.wenhe.dhustore;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@MapperScan("com.wenhe.dhustore.mapper")
@EnableScheduling
public class DhuStoreApplication {

    public static void main(String[] args) {
        SpringApplication.run(DhuStoreApplication.class, args);
    }

}
