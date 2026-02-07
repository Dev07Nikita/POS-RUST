package com.pos.service;

import com.pos.model.Sale;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class PaymentGateway {

    private final MpesaService mpesaService;

    public void processPayment(Sale sale) {
        log.info("Orchestrating {} payment for {} KES", sale.getPaymentMethod(), sale.getTotalAmount());

        switch (sale.getPaymentMethod().toUpperCase()) {
            case "M-PESA", "M-PESA STK" -> triggerMpesa(sale);
            case "KCB" -> triggerKcb(sale);
            case "EQUITY" -> triggerEquity(sale);
            case "CASH" -> finalizeCash(sale);
            default -> log.warn("Unknown method: {}", sale.getPaymentMethod());
        }
    }

    private void triggerMpesa(Sale sale) {
        log.info("Sending STK Push to customer: {}", sale.getCustomerPhone());
        mpesaService.triggerStkPush(sale.getCustomerPhone(), sale.getTotalAmount(), sale.getTransactionId());
    }

    private void triggerKcb(Sale sale) {
        log.info("Connecting to KCB BUNI API...");
        // BUNI integration logic
    }

    private void triggerEquity(Sale sale) {
        log.info("Connecting to Equity Jenga API...");
        // Jenga integration logic
    }

    private void finalizeCash(Sale sale) {
        sale.setStatus("SUCCESS");
        log.info("Cash payment finalized globally.");
    }
}
