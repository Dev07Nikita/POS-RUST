package com.pos.controller;

import com.pos.model.Sale;
import com.pos.repository.SaleRepository;
import com.pos.service.PaymentGateway;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/sync")
@RequiredArgsConstructor
public class SyncController {
    private final SaleRepository saleRepository;
    private final PaymentGateway paymentGateway;

    @PostMapping("/sale")
    public ResponseEntity<String> syncSale(@RequestBody Sale sale) {
        if (saleRepository.findByTransactionId(sale.getTransactionId()).isEmpty()) {
            sale.setStatus("PENDING");
            Sale saved = saleRepository.save(sale);
            paymentGateway.processTransaction(saved);
        }
        return ResponseEntity.ok("Sale record synced reaching central server.");
    }
}
