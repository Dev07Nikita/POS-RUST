package com.pos.controller;

import com.pos.model.SupportIssue;
import com.pos.repository.SupportIssueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/support")
@RequiredArgsConstructor
public class SupportIssueController {
    private final SupportIssueRepository supportIssueRepository;

    @GetMapping
    public List<SupportIssue> getIssues(@RequestParam(required = false) String dept) {
        if (dept != null && !dept.isEmpty()) {
            return supportIssueRepository.findMessagesForDepartment(dept);
        }
        return supportIssueRepository.findAll(Sort.by(Sort.Direction.DESC, "timestamp"));
    }

    @PostMapping
    public SupportIssue createIssue(@RequestBody SupportIssue issue) {
        issue.setTimestamp(LocalDateTime.now());
        if (issue.getStatus() == null)
            issue.setStatus("OPEN");
        return supportIssueRepository.save(issue);
    }

    @PutMapping("/{id}")
    public ResponseEntity<SupportIssue> updateIssue(@PathVariable Long id, @RequestBody SupportIssue updates) {
        if (updates == null) {
            return ResponseEntity.badRequest().build();
        }
        return supportIssueRepository.findById(id)
                .map(issue -> {
                    if (updates.getStatus() != null) {
                        issue.setStatus(updates.getStatus());
                    }
                    if (updates.getMessage() != null) {
                        issue.setMessage(updates.getMessage());
                    }
                    return ResponseEntity.ok(supportIssueRepository.save(issue));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/resolve")
    public ResponseEntity<SupportIssue> resolveIssue(@PathVariable Long id) {
        return supportIssueRepository.findById(id)
                .map(issue -> {
                    issue.setStatus("RESOLVED");
                    return ResponseEntity.ok(supportIssueRepository.save(issue));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
