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
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class AnalyticsController {

    private final SaleRepository saleRepository;
    private final ProductRepository productRepository;

    /**
     * Main analytics endpoint — supports period: daily | monthly | yearly
     * Returns: revenue, cost, profit, orders, payment breakdown, chart data, top products
     */
    @GetMapping("/report")
    public ResponseEntity<?> getReport(@RequestParam(defaultValue = "daily") String period) {
        LocalDateTime start = getPeriodStart(period);
        List<Sale> sales = saleRepository.findByStatusAndTimestampAfterOrderByTimestampDesc("SUCCESS", start);

        double revenue = 0, cost = 0;
        int     orders = sales.size();
        double cash = 0, mpesa = 0, bank = 0;
        int    cashCount = 0, mpesaCount = 0, bankCount = 0;

        // Top products map: productName -> {qty, revenue}
        Map<String, double[]> productStats = new LinkedHashMap<>();

        for (Sale s : sales) {
            revenue += s.getTotalAmount();

            // Cost from sale items (costPrice snapshot via product lookup)
            if (s.getItems() != null) {
                for (SaleItem item : s.getItems()) {
                    double itemCost = 0;
                    if (item.getProduct() != null && item.getProduct().getCostPrice() != null) {
                        itemCost = item.getProduct().getCostPrice() * item.getQuantity();
                    }
                    cost += itemCost;

                    // Top products
                    String name = item.getProductName() != null ? item.getProductName() : "Unknown";
                    productStats.computeIfAbsent(name, k -> new double[]{0, 0});
                    productStats.get(name)[0] += item.getQuantity();
                    productStats.get(name)[1] += item.getSubtotal() != null ? item.getSubtotal() : 0;
                }
            }

            // Payment breakdown
            String method = s.getPaymentMethod() != null ? s.getPaymentMethod().toUpperCase() : "";
            if (method.contains("CASH")) {
                cash += s.getTotalAmount(); cashCount++;
            } else if (method.contains("PESA") || method.contains("STK")) {
                mpesa += s.getTotalAmount(); mpesaCount++;
            } else {
                bank += s.getTotalAmount(); bankCount++;
            }
        }

        double profit = revenue - cost;

        // Chart data — group by sub-period
        Map<String, Double> chartRevenue = buildChartData(sales, period);
        Map<String, Double> chartProfit  = buildProfitChartData(sales, period);

        // Top 5 products by revenue
        List<Map<String, Object>> topProducts = productStats.entrySet().stream()
                .sorted((a, b) -> Double.compare(b.getValue()[1], a.getValue()[1]))
                .limit(5)
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("name", e.getKey());
                    m.put("quantity", (int) e.getValue()[0]);
                    m.put("revenue", Math.round(e.getValue()[1] * 100.0) / 100.0);
                    return m;
                })
                .collect(Collectors.toList());

        // Recent transactions (latest 15)
        List<Map<String, Object>> recentTx = sales.stream().limit(15).map(s -> {
            Map<String, Object> tx = new LinkedHashMap<>();
            tx.put("transactionId", s.getTransactionId());
            tx.put("amount", s.getTotalAmount());
            tx.put("paymentMethod", s.getPaymentMethod());
            tx.put("timestamp", s.getTimestamp() != null ? s.getTimestamp().toString() : "");
            tx.put("itemCount", s.getItems() != null ? s.getItems().size() : 0);
            return tx;
        }).collect(Collectors.toList());

        Map<String, Object> resp = new LinkedHashMap<>();
        // KPI Cards
        resp.put("revenue",   Math.round(revenue * 100.0) / 100.0);
        resp.put("cost",      Math.round(cost    * 100.0) / 100.0);
        resp.put("profit",    Math.round(profit  * 100.0) / 100.0);
        resp.put("orders",    orders);
        resp.put("avgOrder",  orders > 0 ? Math.round((revenue / orders) * 100.0) / 100.0 : 0);
        resp.put("profitMargin", revenue > 0 ? Math.round((profit / revenue) * 1000.0) / 10.0 : 0);

        // Payment breakdown
        resp.put("paymentBreakdown", Map.of(
                "cash",  Map.of("total", Math.round(cash  * 100.0)/100.0, "count", cashCount),
                "mpesa", Map.of("total", Math.round(mpesa * 100.0)/100.0, "count", mpesaCount),
                "bank",  Map.of("total", Math.round(bank  * 100.0)/100.0, "count", bankCount)
        ));

        // Chart + table data
        resp.put("chartRevenue",  chartRevenue);
        resp.put("chartProfit",   chartProfit);
        resp.put("topProducts",   topProducts);
        resp.put("recentSales",   recentTx);
        resp.put("period",        period);
        resp.put("periodLabel",   getPeriodLabel(period));

        // Inventory snapshot
        var products = productRepository.findAll();
        resp.put("totalProducts", products.size());
        resp.put("lowStockCount", products.stream()
                .filter(p -> p.getStockQuantity() != null && p.getStockQuantity() <= 5).count());

        return ResponseEntity.ok(resp);
    }

    /** Legacy summary endpoint — kept for backwards compatibility */
    @GetMapping("/summary")
    public ResponseEntity<?> getSummary() {
        return getReport("daily");
    }

    /** Legacy daily-report endpoint */
    @GetMapping("/daily-report")
    public ResponseEntity<?> getDailyReport() {
        return getReport("daily");
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private LocalDateTime getPeriodStart(String period) {
        LocalDateTime now = LocalDateTime.now();
        return switch (period.toLowerCase()) {
            case "monthly" -> now.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
            case "yearly"  -> now.withDayOfYear(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
            default        -> now.withHour(0).withMinute(0).withSecond(0).withNano(0); // daily
        };
    }

    private String getPeriodLabel(String period) {
        return switch (period.toLowerCase()) {
            case "monthly" -> "This Month";
            case "yearly"  -> "This Year";
            default        -> "Today";
        };
    }

    /** Group sales revenue by hour (daily), day (monthly), or month (yearly) */
    private Map<String, Double> buildChartData(List<Sale> sales, String period) {
        Map<String, Double> data = new LinkedHashMap<>();
        for (Sale s : sales) {
            if (s.getTimestamp() == null) continue;
            String key = switch (period.toLowerCase()) {
                case "monthly" -> String.valueOf(s.getTimestamp().getDayOfMonth());  // day 1-31
                case "yearly"  -> s.getTimestamp().getMonth().toString().substring(0, 3); // JAN..DEC
                default        -> String.format("%02d:00", s.getTimestamp().getHour());    // 00:00-23:00
            };
            data.merge(key, s.getTotalAmount(), Double::sum);
        }
        return data;
    }

    /** Group profit (revenue - cost) by sub-period */
    private Map<String, Double> buildProfitChartData(List<Sale> sales, String period) {
        Map<String, Double> data = new LinkedHashMap<>();
        for (Sale s : sales) {
            if (s.getTimestamp() == null) continue;
            String key = switch (period.toLowerCase()) {
                case "monthly" -> String.valueOf(s.getTimestamp().getDayOfMonth());
                case "yearly"  -> s.getTimestamp().getMonth().toString().substring(0, 3);
                default        -> String.format("%02d:00", s.getTimestamp().getHour());
            };
            double saleCost = 0;
            if (s.getItems() != null) {
                for (SaleItem item : s.getItems()) {
                    if (item.getProduct() != null && item.getProduct().getCostPrice() != null) {
                        saleCost += item.getProduct().getCostPrice() * item.getQuantity();
                    }
                }
            }
            double saleProfit = s.getTotalAmount() - saleCost;
            data.merge(key, saleProfit, Double::sum);
        }
        return data;
    }
}
