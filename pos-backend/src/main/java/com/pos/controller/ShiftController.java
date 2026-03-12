package com.pos.controller;

import com.pos.model.ShiftSession;
import com.pos.repository.SaleRepository;
import com.pos.repository.ShiftSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/shifts")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class ShiftController {

    private final ShiftSessionRepository shiftRepository;
    private final SaleRepository saleRepository;

    /** Get all shifts (descending) */
    @GetMapping
    public ResponseEntity<List<ShiftSession>> getAll() {
        return ResponseEntity.ok(shiftRepository.findAllByOrderByOpenedAtDesc());
    }

    /** Get currently open shift for a cashier */
    @GetMapping("/open")
    public ResponseEntity<ShiftSession> getOpenShift(@RequestParam String cashier) {
        return shiftRepository.findFirstByCashierUsernameAndStatusOrderByOpenedAtDesc(cashier, "OPEN")
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /** Open a new shift */
    @PostMapping("/open")
    public ResponseEntity<?> openShift(@RequestBody Map<String, Object> body) {
        String cashier = (String) body.get("cashierUsername");
        double openingFloat = body.get("openingFloat") != null
                ? ((Number) body.get("openingFloat")).doubleValue() : 0.0;
        String branch = (String) body.getOrDefault("branchCode", null);

        // Check no existing open shift for this cashier
        if (shiftRepository.findFirstByCashierUsernameAndStatusOrderByOpenedAtDesc(cashier, "OPEN").isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "A shift is already open for " + cashier));
        }

        ShiftSession shift = ShiftSession.builder()
                .cashierUsername(cashier)
                .openingFloat(openingFloat)
                .status("OPEN")
                .openedAt(LocalDateTime.now())
                .branchCode(branch)
                .build();

        ShiftSession saved = shiftRepository.save(shift);
        log.info("Shift opened by {} with KES {} float", cashier, openingFloat);
        return ResponseEntity.ok(saved);
    }

    /** Close a shift — records closing cash count and computes variance */
    @PostMapping("/{id}/close")
    public ResponseEntity<?> closeShift(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return shiftRepository.findById(id).map(shift -> {
            if ("CLOSED".equals(shift.getStatus())) {
                return ResponseEntity.badRequest().body((Object) Map.of("error", "Shift already closed."));
            }

            double closingCash = body.get("closingCash") != null
                    ? ((Number) body.get("closingCash")).doubleValue() : 0.0;
            String notes = (String) body.getOrDefault("notes", null);

            // Calculate totals from sales during this shift
            LocalDateTime shiftStart = shift.getOpenedAt();
            LocalDateTime shiftEnd   = LocalDateTime.now();

            var shiftSales = saleRepository.findAll().stream()
                    .filter(s -> "SUCCESS".equals(s.getStatus())
                            && s.getTimestamp() != null
                            && !s.getTimestamp().isBefore(shiftStart)
                            && !s.getTimestamp().isAfter(shiftEnd)
                            && shift.getCashierUsername().equals(s.getCashierUsername()))
                    .collect(Collectors.toList());

            double totalSales = shiftSales.stream()
                    .mapToDouble(s -> s.getFinalAmount() != null ? s.getFinalAmount() : (s.getTotalAmount() != null ? s.getTotalAmount() : 0))
                    .sum();
            double cashSales = shiftSales.stream()
                    .filter(s -> "CASH".equals(s.getPaymentMethod()))
                    .mapToDouble(s -> s.getFinalAmount() != null ? s.getFinalAmount() : (s.getTotalAmount() != null ? s.getTotalAmount() : 0))
                    .sum();
            double mpesaSales = shiftSales.stream()
                    .filter(s -> "MPESA".equals(s.getPaymentMethod()) || "M-PESA".equals(s.getPaymentMethod()))
                    .mapToDouble(s -> s.getFinalAmount() != null ? s.getFinalAmount() : (s.getTotalAmount() != null ? s.getTotalAmount() : 0))
                    .sum();

            double expectedCash = shift.getOpeningFloat() + cashSales;
            double variance = closingCash - expectedCash;

            shift.setClosingCash(closingCash);
            shift.setExpectedCash(Math.round(expectedCash * 100.0) / 100.0);
            shift.setVariance(Math.round(variance * 100.0) / 100.0);
            shift.setTotalSales(Math.round(totalSales * 100.0) / 100.0);
            shift.setCashSales(Math.round(cashSales * 100.0) / 100.0);
            shift.setMpesaSales(Math.round(mpesaSales * 100.0) / 100.0);
            shift.setTransactionCount(shiftSales.size());
            shift.setStatus("CLOSED");
            shift.setClosedAt(shiftEnd);
            shift.setNotes(notes);

            ShiftSession saved = shiftRepository.save(shift);
            log.info("Shift {} closed by {} — variance: KES {}", id, shift.getCashierUsername(), variance);
            return ResponseEntity.ok((Object) saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    /** All shifts for a specific cashier */
    @GetMapping("/cashier/{cashier}")
    public ResponseEntity<List<ShiftSession>> getCashierShifts(@PathVariable String cashier) {
        return ResponseEntity.ok(shiftRepository.findByCashierUsernameOrderByOpenedAtDesc(cashier));
    }

    /** All currently open shifts (for manager view) */
    @GetMapping("/active")
    public ResponseEntity<List<ShiftSession>> getActiveShifts() {
        return ResponseEntity.ok(shiftRepository.findByStatusOrderByOpenedAtDesc("OPEN"));
    }
}
