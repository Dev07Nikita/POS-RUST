package com.pos;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class Main {
    public static void main(String[] args) {
        System.out.println("Starting Safi POS Payment Hub...");
        SpringApplication.run(Main.class, args);
    }
}
