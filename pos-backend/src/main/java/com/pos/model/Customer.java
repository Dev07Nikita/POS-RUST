package com.pos.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Customer profile for CRM — tracks all customers who buy at the store.
 * Square, Shopify, and Lightspeed all have this as a core feature.
 */
@Entity
@Table(name = "customers")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Customer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(unique = true)
    private String phone; // Primary lookup key (used for M-Pesa link)

    private String email;

    private String notes; // Allergies, preferences, etc.

    @Builder.Default
    private Integer loyaltyPoints = 0; // Points earned per purchase

    @Builder.Default
    private Integer totalVisits = 0;

    @Builder.Default
    private Double totalSpent = 0.0;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime lastVisit;
}
