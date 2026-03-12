package com.pos.controller;

import com.pos.model.Supplier;
import com.pos.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/suppliers")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class SupplierController {

    private final SupplierRepository supplierRepository;

    @GetMapping
    public ResponseEntity<List<Supplier>> getAll() {
        return ResponseEntity.ok(supplierRepository.findAllByOrderByNameAsc());
    }

    @GetMapping("/active")
    public ResponseEntity<List<Supplier>> getActive() {
        return ResponseEntity.ok(supplierRepository.findByActiveTrue());
    }

    @GetMapping("/search")
    public ResponseEntity<List<Supplier>> search(@RequestParam String q) {
        return ResponseEntity.ok(supplierRepository.search(q));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Supplier> getOne(@PathVariable Long id) {
        return supplierRepository.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Supplier> create(@RequestBody Supplier supplier) {
        supplier.setCreatedAt(LocalDateTime.now());
        if (supplier.getTotalOrderValue() == null) supplier.setTotalOrderValue(0.0);
        if (supplier.getTotalOrders() == null) supplier.setTotalOrders(0);
        Supplier saved = supplierRepository.save(supplier);
        log.info("Supplier added: {}", saved.getName());
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Supplier> update(@PathVariable Long id, @RequestBody Supplier updated) {
        return supplierRepository.findById(id).map(s -> {
            s.setName(updated.getName());
            s.setContactPerson(updated.getContactPerson());
            s.setPhone(updated.getPhone());
            s.setEmail(updated.getEmail());
            s.setAddress(updated.getAddress());
            s.setTaxPin(updated.getTaxPin());
            s.setNotes(updated.getNotes());
            return ResponseEntity.ok(supplierRepository.save(s));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<Supplier> toggle(@PathVariable Long id) {
        return supplierRepository.findById(id).map(s -> {
            s.setActive(!Boolean.TRUE.equals(s.getActive()));
            return ResponseEntity.ok(supplierRepository.save(s));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** Record a stock purchase from this supplier */
    @PostMapping("/{id}/order")
    public ResponseEntity<Supplier> recordOrder(@PathVariable Long id, @RequestParam double amount) {
        return supplierRepository.findById(id).map(s -> {
            s.setTotalOrders(s.getTotalOrders() + 1);
            s.setTotalOrderValue(s.getTotalOrderValue() + amount);
            s.setLastOrderDate(LocalDateTime.now());
            log.info("Order recorded for supplier {}: KES {}", s.getName(), amount);
            return ResponseEntity.ok(supplierRepository.save(s));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
        if (!supplierRepository.existsById(id)) return ResponseEntity.notFound().build();
        supplierRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> summary() {
        List<Supplier> all = supplierRepository.findAll();
        double totalSpend = all.stream().mapToDouble(s -> s.getTotalOrderValue() != null ? s.getTotalOrderValue() : 0).sum();
        int totalOrders = all.stream().mapToInt(s -> s.getTotalOrders() != null ? s.getTotalOrders() : 0).sum();
        return ResponseEntity.ok(Map.of(
                "total", all.size(),
                "active", all.stream().filter(s -> Boolean.TRUE.equals(s.getActive())).count(),
                "totalSpend", Math.round(totalSpend * 100.0) / 100.0,
                "totalOrders", totalOrders
        ));
    }
}
