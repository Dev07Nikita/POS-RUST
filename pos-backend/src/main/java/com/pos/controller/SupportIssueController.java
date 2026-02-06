package com.pos.controller;

import com.pos.model.SupportIssue;
import com.pos.repository.SupportIssueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/support")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SupportIssueController {
    private final SupportIssueRepository supportIssueRepository;

    @GetMapping
    public List<SupportIssue> getIssues(@RequestParam(required = false) String dept) {
        if (dept != null && !dept.isEmpty()) {
            return supportIssueRepository.findMessagesForDepartment(dept);
        }
        return supportIssueRepository.findAll();
    }

    @PostMapping
    public SupportIssue createIssue(@RequestBody SupportIssue issue) {
        issue.setTimestamp(LocalDateTime.now());
        if (issue.getStatus() == null)
            issue.setStatus("OPEN");
        return supportIssueRepository.save(issue);
    }
}
