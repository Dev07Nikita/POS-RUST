package com.pos.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class EquityService {

    public void processPayment(String merchantCode, Double amount, String reference) {
        log.info("Processing Equity Jenga Payment for Merchant {} - Amount: KES {}", merchantCode, amount);
        // 1. Generate Signature (V2)
        // 2. Call Jenga API /v3-apis/transaction-api/v3.0/payments/merchant
        // 3. Handle response
    }
}
