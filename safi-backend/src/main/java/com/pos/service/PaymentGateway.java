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
            case "CASH" -> finalizeCashPayment(sale);
            default -> throw new IllegalArgumentException("Unknown payment method: " + sale.getPaymentMethod());
        }

        return sale;
    }

    private void triggerMpesaStkPush(Sale sale) {
        log.info("STK Push triggered for transaction {}", sale.getTransactionId());
        // Integration with Daraja API
    }

    private void finalizeCashPayment(Sale sale) {
        sale.setStatus("SUCCESS");
        log.info("Cash payment recorded for transaction {}", sale.getTransactionId());
    }
}
