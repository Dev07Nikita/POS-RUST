package com.pos.service;

import com.pos.model.Sale;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentGateway {

    private final MpesaService mpesaService;

    public Sale processTransaction(Sale sale) {
        log.info("Processing {} payment for KES {}", sale.getPaymentMethod(), sale.getTotalAmount());

        switch (sale.getPaymentMethod()) {
            case "M-PESA", "M-PESA STK" -> {
                try {
                    mpesaService.triggerStkPush(sale);
                    log.info("M-Pesa STK Push initiated for transaction {}", sale.getTransactionId());
                } catch (Exception e) {
                    log.error("M-Pesa payment failed: {}", e.getMessage());
                    sale.setStatus("FAILED");
                    throw e;
                }
            }
            case "CASH" -> finalizeCashPayment(sale);
            default -> throw new IllegalArgumentException("Unknown payment method: " + sale.getPaymentMethod());
        }

        return sale;
    }

    private void finalizeCashPayment(Sale sale) {
        sale.setStatus("SUCCESS");
        log.info("Cash payment recorded for transaction {}", sale.getTransactionId());
    }
}
