package com.pos.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class KcbService {
    
    public void processPayment(String accNumber, Double amount) {
        log.info("Processing KCB BUNI Payment - Amount: KES {}", amount);
        // 1. Get Token from BUNI Portal
        // 2. Prepare Payment Payload
        // 3. Call KCB Receive Payments API
    }
}
