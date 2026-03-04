package com.pos.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "branches")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Branch {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name; // e.g. "Westlands Branch"

    private String code; // e.g. "WL-001"
    private String location; // Physical address
    private String city;
    private String managerName;
    private String managerPhone;
    private String email;
    private Integer staffCount;
    private Boolean active; // true = active, false = closed

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
