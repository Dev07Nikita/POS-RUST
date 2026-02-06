package com.pos.service;

import com.pos.model.Sale;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentGateway {

    public Sale processTransaction(Sale sale) {
        log.info("Processing {} payment for KES {}", sale.getPaymentMethod(), sale.getTotalAmount());

        switch (sale.getPaymentMethod()) {
            case "M-PESA" -> triggerMpesaStkPush(sale);
            case "BANK_KCB" -> triggerKcbPayment(sale);
            case "BANK_EQUITY" -> triggerEquityPayment(sale);
            case "CASH" -> finalizeCashPayment(sale);
            default -> throw new IllegalArgumentException("Unknown payment method");
        }

        return sale;
    }

    private void triggerMpesaStkPush(Sale sale) {
        log.info("STK Push triggered for transaction {}", sale.getTransactionId());
        // Integration with Daraja API
    }

    private void triggerKcbPayment(Sale sale) {
        log.info("KCB API call for transaction {}", sale.getTransactionId());
        // Integration with BUNI API
    }

    private void triggerEquityPayment(Sale sale) {
        log.info("Equity Jenga API call for transaction {}", sale.getTransactionId());
        // Integration with Jenga API
    }

    private void finalizeCashPayment(Sale sale) {
        sale.setStatus("SUCCESS");
        log.info("Cash payment recorded for transaction {}", sale.getTransactionId());
    }
}
