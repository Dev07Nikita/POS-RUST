package com.pos.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "support_issues")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SupportIssue {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String department; // The department raising the issue (e.g., CASHIER, LOGISTICS)

    @Column(nullable = false)
    private String targetDepartment; // The destination department (e.g., MANAGER, LOGISTICS, ALL)

    @Column(columnDefinition = "TEXT", nullable = false)
    private String message;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Builder.Default
    private String status = "OPEN"; // OPEN, RESOLVED
}
