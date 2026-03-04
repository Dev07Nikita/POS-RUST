package com.pos.controller;

import com.pos.model.Branch;
import com.pos.repository.BranchRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/branches")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class BranchController {

    private final BranchRepository branchRepository;

    /** Get all branches */
    @GetMapping
    public ResponseEntity<List<Branch>> getAllBranches() {
        return ResponseEntity.ok(branchRepository.findByOrderByNameAsc());
    }

    /** Get only active branches */
    @GetMapping("/active")
    public ResponseEntity<List<Branch>> getActiveBranches() {
        return ResponseEntity.ok(branchRepository.findByActiveTrue());
    }

    /** Get a single branch */
    @GetMapping("/{id}")
    public ResponseEntity<Branch> getBranch(@PathVariable Long id) {
        return branchRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /** Create a new branch */
    @PostMapping
    public ResponseEntity<Branch> createBranch(@RequestBody Branch branch) {
        branch.setCreatedAt(LocalDateTime.now());
        if (branch.getActive() == null)
            branch.setActive(true);
        Branch saved = branchRepository.save(branch);
        log.info("Branch created: {} ({})", saved.getName(), saved.getCode());
        return ResponseEntity.ok(saved);
    }

    /** Update a branch */
    @PutMapping("/{id}")
    public ResponseEntity<Branch> updateBranch(@PathVariable Long id, @RequestBody Branch updated) {
        return branchRepository.findById(id).map(existing -> {
            existing.setName(updated.getName());
            existing.setCode(updated.getCode());
            existing.setLocation(updated.getLocation());
            existing.setCity(updated.getCity());
            existing.setManagerName(updated.getManagerName());
            existing.setManagerPhone(updated.getManagerPhone());
            existing.setEmail(updated.getEmail());
            existing.setStaffCount(updated.getStaffCount());
            existing.setActive(updated.getActive());
            return ResponseEntity.ok(branchRepository.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** Toggle a branch active/inactive */
    @PatchMapping("/{id}/toggle")
    public ResponseEntity<Branch> toggleBranch(@PathVariable Long id) {
        return branchRepository.findById(id).map(b -> {
            b.setActive(!Boolean.TRUE.equals(b.getActive()));
            branchRepository.save(b);
            log.info("Branch {} toggled to active={}", b.getName(), b.getActive());
            return ResponseEntity.ok(b);
        }).orElse(ResponseEntity.notFound().build());
    }

    /** Delete a branch */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteBranch(@PathVariable Long id) {
        if (!branchRepository.existsById(id))
            return ResponseEntity.notFound().build();
        branchRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }

    /** Summary stats for dashboard */
    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> summary() {
        List<Branch> all = branchRepository.findAll();
        long active = all.stream().filter(b -> Boolean.TRUE.equals(b.getActive())).count();
        int totalStaff = all.stream().mapToInt(b -> b.getStaffCount() != null ? b.getStaffCount() : 0).sum();
        return ResponseEntity.ok(Map.of(
                "total", all.size(),
                "active", active,
                "inactive", all.size() - active,
                "totalStaff", totalStaff));
    }
}
