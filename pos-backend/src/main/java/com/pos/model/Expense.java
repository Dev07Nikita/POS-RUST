package com.pos.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Business expense tracking — matches Square / Lightspeed expense management.
 * Categories: STOCK, RENT, UTILITIES, SALARIES, MARKETING, TRANSPORT, OTHER
 */
@Entity
@Table(name = "expenses")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Expense {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String description;

    @Column(nullable = false)
    private Double amount;

    @Builder.Default
    private String category = "OTHER"; // STOCK, RENT, UTILITIES, SALARIES, MARKETING, TRANSPORT, OTHER

    private String paidTo;       // Vendor / payee name
    private String reference;    // Receipt or invoice number
    private String recordedBy;   // Username of staff who logged it

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime date = LocalDateTime.now();

    private String branchCode;   // For multi-branch expense tracking
}
