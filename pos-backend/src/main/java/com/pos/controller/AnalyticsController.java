package com.pos.controller;

import com.pos.model.Sale;
import com.pos.repository.SaleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AnalyticsController {
    private final SaleRepository saleRepository;

    @GetMapping("/summary")
    public ResponseEntity<?> getSummary() {
        List<Sale> sales = saleRepository.findAll();

        double totalRevenue = sales.stream().mapToDouble(Sale::getTotalAmount).sum();
        long totalOrders = sales.size();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalRevenue", totalRevenue);
        stats.put("totalOrders", totalOrders);
        stats.put("recentSales", sales.stream().limit(5).toList());

        return ResponseEntity.ok(stats);
    }
}
