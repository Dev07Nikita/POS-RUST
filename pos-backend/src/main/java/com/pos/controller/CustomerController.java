package com.pos.controller;

import com.pos.model.Customer;
import com.pos.repository.CustomerRepository;
import com.pos.repository.SaleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class CustomerController {

    private final CustomerRepository customerRepository;
    private final SaleRepository saleRepository;

    /** Get all customers sorted by total spend */
    @GetMapping
    public ResponseEntity<List<Customer>> getAllCustomers() {
        return ResponseEntity.ok(customerRepository.findAllByOrderByTotalSpentDesc());
    }

    /** Search customers by name or phone */
    @GetMapping("/search")
    public ResponseEntity<List<Customer>> search(@RequestParam String q) {
        if (q == null || q.trim().length() < 1)
            return ResponseEntity.ok(List.of());
        return ResponseEntity.ok(customerRepository.search(q.trim()));
    }

    /** Look up by exact phone number */
    @GetMapping("/phone/{phone}")
    public ResponseEntity<Customer> getByPhone(@PathVariable String phone) {
        return customerRepository.findByPhone(phone)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /** Get a specific customer */
    @GetMapping("/{id}")
    public ResponseEntity<Customer> getCustomer(@PathVariable Long id) {
        return customerRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /** Create a new customer */
    @PostMapping
    public ResponseEntity<?> createCustomer(@RequestBody Customer customer) {
        if (customer.getPhone() != null) {
            if (customerRepository.findByPhone(customer.getPhone()).isPresent()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "A customer with this phone number already exists."));
            }
        }
        customer.setCreatedAt(LocalDateTime.now());
        if (customer.getLoyaltyPoints() == null)
            customer.setLoyaltyPoints(0);
        if (customer.getTotalVisits() == null)
            customer.setTotalVisits(0);
        if (customer.getTotalSpent() == null)
            customer.setTotalSpent(0.0);
        Customer saved = customerRepository.save(customer);
        log.info("New customer registered: {} ({})", saved.getName(), saved.getPhone());
        return ResponseEntity.ok(saved);
    }

    /** Update an existing customer */
    @PutMapping("/{id}")
    public ResponseEntity<Customer> updateCustomer(@PathVariable Long id, @RequestBody Customer updated) {
        return customerRepository.findById(id).map(c -> {
            c.setName(updated.getName());
            c.setPhone(updated.getPhone());
            c.setEmail(updated.getEmail());
            c.setNotes(updated.getNotes());
            return ResponseEntity.ok(customerRepository.save(c));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** Add loyalty points after a purchase */
    @PatchMapping("/{id}/points")
    public ResponseEntity<Customer> addPoints(@PathVariable Long id,
            @RequestParam int points,
            @RequestParam(required = false, defaultValue = "0") double spent) {
        return customerRepository.findById(id).map(c -> {
            c.setLoyaltyPoints(c.getLoyaltyPoints() + points);
            c.setTotalSpent(c.getTotalSpent() + spent);
            c.setTotalVisits(c.getTotalVisits() + 1);
            c.setLastVisit(LocalDateTime.now());
            return ResponseEntity.ok(customerRepository.save(c));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** Delete a customer */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteCustomer(@PathVariable Long id) {
        if (!customerRepository.existsById(id))
            return ResponseEntity.notFound().build();
        customerRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }

    /** Summary stats */
    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> summary() {
        List<Customer> all = customerRepository.findAll();
        int totalPoints = all.stream().mapToInt(c -> c.getLoyaltyPoints() != null ? c.getLoyaltyPoints() : 0).sum();
        double totalSpend = all.stream().mapToDouble(c -> c.getTotalSpent() != null ? c.getTotalSpent() : 0).sum();
        return ResponseEntity.ok(Map.of(
                "total", all.size(),
                "totalLoyaltyPoints", totalPoints,
                "totalSpend", totalSpend));
    }
}
