package com.pos.controller;

import com.pos.model.Sale;
import com.pos.service.SaleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/sales")
@RequiredArgsConstructor
public class SaleController {
    private final SaleService saleService;

    @PostMapping("/checkout")
    public ResponseEntity<Sale> checkout(@RequestBody Sale sale) {
        return ResponseEntity.ok(saleService.processSale(sale));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Sale> getSale(@PathVariable Long id) {
        // Implementation for getting a sale record
        return ResponseEntity.ok().build();
    }
}
