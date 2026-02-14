package com.pos.controller;

import com.pos.model.Sale;
import com.pos.model.SaleItem;
import com.pos.model.Product;
import com.pos.repository.SaleRepository;
import com.pos.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
@Slf4j
public class AnalyticsController {
    private final SaleRepository saleRepository;
    private final ProductRepository productRepository;

    @GetMapping("/summary")
    public ResponseEntity<?> getSummary() {
        // Get today's successful sales
        LocalDateTime todayStart = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0).withNano(0);
        List<Sale> todaySales = saleRepository.findByStatusAndTimestampAfterOrderByTimestampDesc("SUCCESS", todayStart);

        double totalRevenue = todaySales.stream().mapToDouble(Sale::getTotalAmount).sum();
        long totalOrders = todaySales.size();
        double avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // Payment method breakdown
        double cashTotal = 0, mpesaTotal = 0, bankTotal = 0;
        for (Sale s : todaySales) {
            String method = s.getPaymentMethod() != null ? s.getPaymentMethod().toUpperCase() : "";
            if (method.contains("CASH"))
                cashTotal += s.getTotalAmount();
            else if (method.contains("PESA") || method.contains("STK"))
                mpesaTotal += s.getTotalAmount();
            else
                bankTotal += s.getTotalAmount();
        }

        // Product stock info
        var products = productRepository.findAll();
        long totalProducts = products.size();
        long lowStockCount = products.stream().filter(p -> p.getStockQuantity() != null && p.getStockQuantity() <= 5)
                .count();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalRevenue", totalRevenue);
        stats.put("totalOrders", totalOrders);
        stats.put("averageOrder", avgOrder);
        stats.put("recentSales", todaySales.stream().limit(10).toList());
        stats.put("paymentBreakdown", Map.of("cash", cashTotal, "mpesa", mpesaTotal, "bank", bankTotal));
        stats.put("totalProducts", totalProducts);
        stats.put("lowStockCount", lowStockCount);

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/daily-report")
    public ResponseEntity<?> getDailyReport() {
        LocalDateTime todayStart = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0).withNano(0);
        List<Sale> todaySales = saleRepository.findByStatusAndTimestampAfterOrderByTimestampDesc("SUCCESS", todayStart);

        double totalRevenue = todaySales.stream().mapToDouble(Sale::getTotalAmount).sum();
        long totalOrders = todaySales.size();
        double avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // Payment breakdown
        double cashTotal = 0, mpesaTotal = 0, bankTotal = 0;
        int cashCount = 0, mpesaCount = 0, bankCount = 0;
        for (Sale s : todaySales) {
            String method = s.getPaymentMethod() != null ? s.getPaymentMethod().toUpperCase() : "";
            if (method.contains("CASH")) {
                cashTotal += s.getTotalAmount();
                cashCount++;
            } else if (method.contains("PESA") || method.contains("STK")) {
                mpesaTotal += s.getTotalAmount();
                mpesaCount++;
            } else {
                bankTotal += s.getTotalAmount();
                bankCount++;
            }
        }

        Map<String, Object> report = new HashMap<>();
        report.put("date", LocalDateTime.now().toLocalDate().toString());
        report.put("totalRevenue", totalRevenue);
        report.put("totalOrders", totalOrders);
        report.put("averageOrder", avgOrder);
        report.put("transactions", todaySales);
        report.put("paymentBreakdown", Map.of(
                "cash", Map.of("total", cashTotal, "count", cashCount),
                "mpesa", Map.of("total", mpesaTotal, "count", mpesaCount),
                "bank", Map.of("total", bankTotal, "count", bankCount)));

        return ResponseEntity.ok(report);
    }
}
