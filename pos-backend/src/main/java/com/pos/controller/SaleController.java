package com.pos.controller;

import com.pos.model.Sale;
import com.pos.model.SaleItem;
import com.pos.repository.CustomerRepository;
import com.pos.repository.ProductRepository;
import com.pos.repository.SaleRepository;
import com.pos.service.SaleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/sales")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class SaleController {
    private final SaleService saleService;
    private final SaleRepository saleRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;

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

    /** Get all sales with optional date filter */
    @GetMapping
    public ResponseEntity<List<Sale>> getAllSales(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        List<Sale> all = saleRepository.findAll();
        if (from != null) {
            LocalDateTime fromDt = LocalDate.parse(from).atStartOfDay();
            all = all.stream().filter(s -> s.getTimestamp() != null && s.getTimestamp().isAfter(fromDt))
                    .collect(Collectors.toList());
        }
        if (to != null) {
            LocalDateTime toDt = LocalDate.parse(to).atTime(23, 59, 59);
            all = all.stream().filter(s -> s.getTimestamp() != null && s.getTimestamp().isBefore(toDt))
                    .collect(Collectors.toList());
        }
        all.sort(Comparator.comparing(Sale::getTimestamp, Comparator.nullsLast(Comparator.reverseOrder())));
        return ResponseEntity.ok(all);
    }

    /** ===== REFUND ===== */
    @PostMapping("/{id}/refund")
    public ResponseEntity<?> refundSale(@PathVariable Long id) {
        return saleRepository.findById(id).map(sale -> {
            if (Boolean.TRUE.equals(sale.getIsRefunded())) {
                return ResponseEntity.badRequest().body(Map.of("error", "Sale already refunded."));
            }
            if ("HELD".equals(sale.getStatus())) {
                return ResponseEntity.badRequest().body(Map.of("error", "Cannot refund a held order."));
            }
            // Restore stock for each item
            if (sale.getItems() != null) {
                for (SaleItem item : sale.getItems()) {
                    productRepository.findAll().stream()
                            .filter(p -> p.getName().equals(item.getProductName()))
                            .findFirst()
                            .ifPresent(p -> {
                                p.setStockQuantity(p.getStockQuantity() + item.getQuantity());
                                productRepository.save(p);
                            });
                }
            }
            // Update customer stats
            if (sale.getCustomerId() != null) {
                customerRepository.findById(sale.getCustomerId()).ifPresent(c -> {
                    double spent = sale.getFinalAmount() != null ? sale.getFinalAmount()
                            : (sale.getTotalAmount() != null ? sale.getTotalAmount() : 0);
                    c.setTotalSpent(Math.max(0, c.getTotalSpent() - spent));
                    c.setTotalVisits(Math.max(0, c.getTotalVisits() - 1));
                    int pointsToRemove = (int) (spent / 100);
                    c.setLoyaltyPoints(Math.max(0, c.getLoyaltyPoints() - pointsToRemove));
                    customerRepository.save(c);
                });
            }
            sale.setIsRefunded(true);
            sale.setStatus("REFUNDED");
            sale.setRefundedAt(LocalDateTime.now());
            Sale saved = saleRepository.save(sale);
            log.info("Sale {} refunded — stock restored", sale.getTransactionId());
            return ResponseEntity.ok((Object) saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    /** ===== HOLD ORDER ===== */
    @PostMapping("/hold")
    public ResponseEntity<Sale> holdOrder(@RequestBody Sale sale) {
        sale.setStatus("HELD");
        if (sale.getTransactionId() == null) {
            sale.setTransactionId("HOLD-" + System.currentTimeMillis());
        }
        sale.setTimestamp(LocalDateTime.now());
        Sale saved = saleRepository.save(sale);
        log.info("Order held: {}", saved.getTransactionId());
        return ResponseEntity.ok(saved);
    }

    /** Get all currently held (parked) orders */
    @GetMapping("/held")
    public ResponseEntity<List<Sale>> getHeldOrders() {
        List<Sale> held = saleRepository.findAll().stream()
                .filter(s -> "HELD".equals(s.getStatus()))
                .sorted(Comparator.comparing(Sale::getTimestamp, Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());
        return ResponseEntity.ok(held);
    }

    /** Release (delete) a held order */
    @DeleteMapping("/held/{id}")
    public ResponseEntity<Map<String, String>> releaseHeldOrder(@PathVariable Long id) {
        if (!saleRepository.existsById(id))
            return ResponseEntity.notFound().build();
        saleRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("status", "released"));
    }

    /** ===== Z-REPORT (End of Day) ===== */
    @GetMapping("/z-report")
    public ResponseEntity<Map<String, Object>> zReport(@RequestParam(required = false) String date) {
        LocalDate reportDate = date != null ? LocalDate.parse(date) : LocalDate.now();
        LocalDateTime start = reportDate.atStartOfDay();
        LocalDateTime end = reportDate.atTime(23, 59, 59);

        List<Sale> daySales = saleRepository.findAll().stream()
                .filter(s -> s.getTimestamp() != null
                        && !s.getTimestamp().isBefore(start)
                        && !s.getTimestamp().isAfter(end)
                        && "SUCCESS".equals(s.getStatus()))
                .collect(Collectors.toList());

        double totalRevenue = daySales.stream()
                .mapToDouble(s -> s.getFinalAmount() != null ? s.getFinalAmount()
                        : (s.getTotalAmount() != null ? s.getTotalAmount() : 0))
                .sum();
        double totalDiscount = daySales.stream()
                .mapToDouble(s -> s.getDiscountAmount() != null ? s.getDiscountAmount() : 0).sum();
        long cashCount = daySales.stream().filter(s -> "CASH".equals(s.getPaymentMethod())).count();
        long mpesaCount = daySales.stream()
                .filter(s -> "MPESA".equals(s.getPaymentMethod()) || "M-PESA".equals(s.getPaymentMethod())).count();
        double cashTotal = daySales.stream().filter(s -> "CASH".equals(s.getPaymentMethod()))
                .mapToDouble(s -> s.getFinalAmount() != null ? s.getFinalAmount()
                        : (s.getTotalAmount() != null ? s.getTotalAmount() : 0))
                .sum();
        double mpesaTotal = daySales.stream()
                .filter(s -> "MPESA".equals(s.getPaymentMethod()) || "M-PESA".equals(s.getPaymentMethod()))
                .mapToDouble(s -> s.getFinalAmount() != null ? s.getFinalAmount()
                        : (s.getTotalAmount() != null ? s.getTotalAmount() : 0))
                .sum();
        long refunds = saleRepository.findAll().stream()
                .filter(s -> s.getTimestamp() != null && !s.getTimestamp().isBefore(start)
                        && !s.getTimestamp().isAfter(end) && "REFUNDED".equals(s.getStatus()))
                .count();
        Map<String, Long> byCashier = daySales.stream()
                .collect(Collectors.groupingBy(s -> s.getCashierUsername() != null ? s.getCashierUsername() : "Unknown",
                        Collectors.counting()));

        return ResponseEntity.ok(Map.of(
                "date", reportDate.toString(),
                "totalTransactions", daySales.size(),
                "totalRevenue", Math.round(totalRevenue * 100.0) / 100.0,
                "totalDiscount", Math.round(totalDiscount * 100.0) / 100.0,
                "cashTransactions", cashCount,
                "cashTotal", Math.round(cashTotal * 100.0) / 100.0,
                "mpesaTransactions", mpesaCount,
                "mpesaTotal", Math.round(mpesaTotal * 100.0) / 100.0,
                "refunds", refunds,
                "salesByCashier", byCashier));
    }

    /** ===== CASHIER PERFORMANCE ===== */
    @GetMapping("/cashier-stats")
    public ResponseEntity<List<Map<String, Object>>> cashierStats() {
        List<Sale> successful = saleRepository.findAll().stream()
                .filter(s -> "SUCCESS".equals(s.getStatus())).collect(Collectors.toList());
        Map<String, List<Sale>> byCashier = successful.stream()
                .collect(Collectors
                        .groupingBy(s -> s.getCashierUsername() != null ? s.getCashierUsername() : "Unknown"));
        List<Map<String, Object>> stats = byCashier.entrySet().stream().map(e -> {
            double revenue = e.getValue().stream()
                    .mapToDouble(s -> s.getFinalAmount() != null ? s.getFinalAmount()
                            : (s.getTotalAmount() != null ? s.getTotalAmount() : 0))
                    .sum();
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("cashier", e.getKey());
            m.put("transactions", e.getValue().size());
            m.put("revenue", Math.round(revenue * 100.0) / 100.0);
            return m;
        }).sorted(Comparator.comparingDouble(m -> -((Number) m.get("revenue")).doubleValue()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(stats);
    }

    /** Sales history for a specific customer */
    @GetMapping("/customer/{customerId}")
    public ResponseEntity<List<Sale>> getCustomerSales(@PathVariable Long customerId) {
        List<Sale> sales = saleRepository.findAll().stream()
                .filter(s -> customerId.equals(s.getCustomerId()))
                .sorted(Comparator.comparing(Sale::getTimestamp, Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());
        return ResponseEntity.ok(sales);
    }

    /** Sync endpoint — Rust Tauri terminal pushes local sales to central DB */
    @PostMapping("/sync")
    public ResponseEntity<?> syncSale(@RequestBody Map<String, Object> saleData) {
        try {
            String transactionId = (String) saleData.get("transactionId");
            if (saleRepository.findByTransactionId(transactionId).isPresent()) {
                return ResponseEntity.ok(Map.of("status", "already_synced", "transactionId", transactionId));
            }
            Sale sale = Sale.builder()
                    .transactionId(transactionId)
                    .totalAmount(((Number) saleData.get("totalAmount")).doubleValue())
                    .paymentMethod((String) saleData.get("paymentMethod"))
                    .customerPhone((String) saleData.get("customerPhone"))
                    .cashierUsername((String) saleData.getOrDefault("cashierUsername", null))
                    .status("SUCCESS").isRefunded(false).build();
            String timestamp = (String) saleData.get("timestamp");
            sale.setTimestamp(timestamp != null ? LocalDateTime.parse(timestamp, DateTimeFormatter.ISO_DATE_TIME)
                    : LocalDateTime.now());
            List<SaleItem> items = new ArrayList<>();
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> itemsData = (List<Map<String, Object>>) saleData.get("items");
            if (itemsData != null) {
                for (Map<String, Object> itemData : itemsData) {
                    items.add(SaleItem.builder()
                            .productName((String) itemData.get("productName"))
                            .quantity(((Number) itemData.get("quantity")).intValue())
                            .unitPrice(((Number) itemData.get("unitPrice")).doubleValue())
                            .subtotal(((Number) itemData.get("subtotal")).doubleValue()).build());
                }
            }
            sale.setItems(items);
            for (SaleItem item : items) {
                if (item.getProductName() != null) {
                    productRepository.findAll().stream().filter(p -> p.getName().equals(item.getProductName()))
                            .findFirst()
                            .ifPresent(p -> {
                                p.setStockQuantity(Math.max(0, p.getStockQuantity() - item.getQuantity()));
                                productRepository.save(p);
                            });
                }
            }
            Sale savedSale = saleRepository.save(sale);
            log.info("Synced sale {} — {} items, KES {}", transactionId, items.size(), sale.getTotalAmount());
            return ResponseEntity
                    .ok(Map.of("status", "synced", "transactionId", transactionId, "id", savedSale.getId()));
        } catch (Exception e) {
            log.error("Sync failed: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
