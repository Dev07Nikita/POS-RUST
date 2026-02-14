package com.pos.controller;

import com.pos.model.Sale;
import com.pos.model.SaleItem;
import com.pos.model.Product;
import com.pos.repository.ProductRepository;
import com.pos.repository.SaleRepository;
import com.pos.service.SaleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/api/sales")
@RequiredArgsConstructor
@Slf4j
public class SaleController {
    private final SaleService saleService;
    private final SaleRepository saleRepository;
    private final ProductRepository productRepository;

    @PostMapping("/checkout")
    public ResponseEntity<Sale> checkout(@RequestBody Sale sale) {
        return ResponseEntity.ok(saleService.processSale(sale));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Sale> getSale(@PathVariable Long id) {
        return saleRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/recent")
    public ResponseEntity<List<Sale>> getRecentSales() {
        List<Sale> sales = saleRepository.findTop20ByOrderByTimestampDesc();
        return ResponseEntity.ok(sales);
    }

    /**
     * Sync endpoint — called by Rust Tauri terminal to push local sales to central
     * DB.
     * The Rust sync worker sends sale data here after local checkout.
     */
    @PostMapping("/sync")
    public ResponseEntity<?> syncSale(@RequestBody Map<String, Object> saleData) {
        try {
            String transactionId = (String) saleData.get("transactionId");

            // Check if already synced
            if (saleRepository.findByTransactionId(transactionId).isPresent()) {
                return ResponseEntity.ok(Map.of("status", "already_synced", "transactionId", transactionId));
            }

            // Build Sale entity from sync data
            Sale sale = Sale.builder()
                    .transactionId(transactionId)
                    .totalAmount(((Number) saleData.get("totalAmount")).doubleValue())
                    .paymentMethod((String) saleData.get("paymentMethod"))
                    .customerPhone((String) saleData.get("customerPhone"))
                    .status("SUCCESS")
                    .build();

            // Parse timestamp
            String timestamp = (String) saleData.get("timestamp");
            if (timestamp != null) {
                try {
                    sale.setTimestamp(LocalDateTime.parse(timestamp, DateTimeFormatter.ISO_DATE_TIME));
                } catch (Exception e) {
                    sale.setTimestamp(LocalDateTime.now());
                }
            } else {
                sale.setTimestamp(LocalDateTime.now());
            }

            // Build sale items
            List<SaleItem> items = new ArrayList<>();
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> itemsData = (List<Map<String, Object>>) saleData.get("items");

            if (itemsData != null) {
                for (Map<String, Object> itemData : itemsData) {
                    SaleItem saleItem = SaleItem.builder()
                            .productName((String) itemData.get("productName"))
                            .quantity(((Number) itemData.get("quantity")).intValue())
                            .unitPrice(((Number) itemData.get("unitPrice")).doubleValue())
                            .subtotal(((Number) itemData.get("subtotal")).doubleValue())
                            .build();

                    items.add(saleItem);
                }
            }

            sale.setItems(items);

            // Deduct stock in Spring Boot DB
            for (SaleItem item : items) {
                if (item.getProductName() != null) {
                    productRepository.findAll().stream()
                            .filter(p -> p.getName().equals(item.getProductName()))
                            .findFirst()
                            .ifPresent(product -> {
                                int newStock = Math.max(0, product.getStockQuantity() - item.getQuantity());
                                product.setStockQuantity(newStock);
                                productRepository.save(product);
                                log.info("Stock updated for {}: {} -> {}", product.getName(),
                                        product.getStockQuantity() + item.getQuantity(), newStock);
                            });
                }
            }

            Sale savedSale = saleRepository.save(sale);
            log.info("Synced sale {} with {} items, total: KES {}", transactionId, items.size(), sale.getTotalAmount());

            return ResponseEntity.ok(Map.of(
                    "status", "synced",
                    "transactionId", transactionId,
                    "id", savedSale.getId()));
        } catch (Exception e) {
            log.error("Sync failed: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
