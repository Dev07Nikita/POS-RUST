package com.pos.controller;

import com.pos.model.AuditLog;
import com.pos.model.Sale;
import com.pos.model.SupportIssue;
import com.pos.model.User;
import com.pos.repository.AuditLogRepository;
import com.pos.repository.SaleRepository;
import com.pos.repository.SupportIssueRepository;
import com.pos.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Admin Hub: view all users, audit logs (everything users do), sales, and logistics/support.
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AuthService authService;
    private final AuditLogRepository auditLogRepository;
    private final SaleRepository saleRepository;
    private final SupportIssueRepository supportIssueRepository;

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboard() {
        List<User> users = authService.getAllUsers();
        users.forEach(u -> u.setPassword(null));

        List<AuditLog> auditLogs = auditLogRepository.findAll(
                Sort.by(Sort.Direction.DESC, "timestamp"));
        // Limit to last 200 for performance
        if (auditLogs.size() > 200) {
            auditLogs = auditLogs.subList(0, 200);
        }

        List<Sale> recentSales = saleRepository.findTop20ByOrderByTimestampDesc();

        List<SupportIssue> supportIssues = supportIssueRepository.findAll(
                Sort.by(Sort.Direction.DESC, "timestamp"));
        List<SupportIssue> logisticsIssues = supportIssues.stream()
                .filter(s -> "LOGISTICS".equalsIgnoreCase(s.getDepartment())
                        || "LOGISTICS".equalsIgnoreCase(s.getTargetDepartment())
                        || "ALL".equalsIgnoreCase(s.getTargetDepartment()))
                .collect(Collectors.toList());

        Map<String, Object> dashboard = new HashMap<>();
        dashboard.put("users", users);
        dashboard.put("auditLogs", auditLogs);
        dashboard.put("recentSales", recentSales);
        dashboard.put("supportIssues", supportIssues);
        dashboard.put("logisticsIssues", logisticsIssues);

        return ResponseEntity.ok(dashboard);
    }
}
