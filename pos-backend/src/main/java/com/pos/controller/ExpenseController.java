package com.pos.controller;

import com.pos.model.Expense;
import com.pos.repository.ExpenseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/expenses")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class ExpenseController {

    private final ExpenseRepository expenseRepository;

    private static final List<String> CATEGORIES = List.of(
        "STOCK", "RENT", "UTILITIES", "SALARIES", "MARKETING", "TRANSPORT", "OTHER"
    );

    @GetMapping
    public ResponseEntity<List<Expense>> getAllExpenses(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String category) {
        List<Expense> all;
        if (from != null) {
            LocalDateTime fromDt = LocalDate.parse(from).atStartOfDay();
            all = expenseRepository.findByDateAfterOrderByDateDesc(fromDt);
        } else {
            all = expenseRepository.findAllByOrderByDateDesc();
        }
        if (category != null && !category.isBlank()) {
            all = all.stream().filter(e -> category.equalsIgnoreCase(e.getCategory())).collect(Collectors.toList());
        }
        return ResponseEntity.ok(all);
    }

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> summary() {
        List<Expense> all = expenseRepository.findAllByOrderByDateDesc();
        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        LocalDateTime weekStart  = LocalDate.now().minusDays(7).atStartOfDay();
        LocalDateTime monthStart = LocalDate.now().withDayOfMonth(1).atStartOfDay();

        double today = all.stream().filter(e -> e.getDate().isAfter(todayStart))
                .mapToDouble(Expense::getAmount).sum();
        double week = all.stream().filter(e -> e.getDate().isAfter(weekStart))
                .mapToDouble(Expense::getAmount).sum();
        double month = all.stream().filter(e -> e.getDate().isAfter(monthStart))
                .mapToDouble(Expense::getAmount).sum();
        double total = all.stream().mapToDouble(Expense::getAmount).sum();

        // Breakdown by category
        Map<String, Double> byCategory = all.stream()
                .collect(Collectors.groupingBy(
                        e -> e.getCategory() != null ? e.getCategory() : "OTHER",
                        Collectors.summingDouble(Expense::getAmount)));

        return ResponseEntity.ok(Map.of(
                "totalExpenses", all.size(),
                "todayTotal", Math.round(today * 100.0) / 100.0,
                "weekTotal", Math.round(week * 100.0) / 100.0,
                "monthTotal", Math.round(month * 100.0) / 100.0,
                "allTimeTotal", Math.round(total * 100.0) / 100.0,
                "byCategory", byCategory,
                "categories", CATEGORIES
        ));
    }

    @PostMapping
    public ResponseEntity<Expense> createExpense(@RequestBody Expense expense) {
        expense.setDate(expense.getDate() != null ? expense.getDate() : LocalDateTime.now());
        Expense saved = expenseRepository.save(expense);
        log.info("Expense recorded: {} KES {} by {}", expense.getCategory(), expense.getAmount(), expense.getRecordedBy());
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Expense> updateExpense(@PathVariable Long id, @RequestBody Expense updated) {
        return expenseRepository.findById(id).map(e -> {
            e.setDescription(updated.getDescription());
            e.setAmount(updated.getAmount());
            e.setCategory(updated.getCategory());
            e.setPaidTo(updated.getPaidTo());
            e.setReference(updated.getReference());
            e.setDate(updated.getDate() != null ? updated.getDate() : e.getDate());
            return ResponseEntity.ok(expenseRepository.save(e));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteExpense(@PathVariable Long id) {
        if (!expenseRepository.existsById(id)) return ResponseEntity.notFound().build();
        expenseRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }
}
