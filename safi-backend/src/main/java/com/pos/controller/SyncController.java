package com.pos.controller;

import com.pos.model.Sale;
import com.pos.repository.SaleRepository;
import com.pos.service.PaymentGateway;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/sales")
@RequiredArgsConstructor
public class SyncController {
    private final SaleRepository saleRepository;
    private final PaymentGateway paymentGateway;

    @PostMapping("/sync")
    public ResponseEntity<String> syncSale(@RequestBody Sale sale) {
        // Find existing or save new
        if (saleRepository.findByTransactionId(sale.getTransactionId()).isEmpty()) {
            sale.setStatus("PENDING");
            Sale saved = saleRepository.save(sale);

            // If it's a mobile payment, the gateway will handle the trigger
            if (!"CASH".equalsIgnoreCase(saved.getPaymentMethod())) {
                paymentGateway.processTransaction(saved);
            } else {
                saved.setStatus("SUCCESS");
                saleRepository.save(saved);
            }
        }
        return ResponseEntity.ok("Synced");
    }
}
