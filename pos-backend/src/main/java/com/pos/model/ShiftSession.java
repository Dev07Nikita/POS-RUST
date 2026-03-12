package com.pos.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Shift session — tracks cash float, opening/closing balances, and reconciliation.
 * This is a core feature of Square, Toast, Clover, and Lightspeed POS systems.
 * Every shift has an opening cash float and a closing cash count for reconciliation.
 */
@Entity
@Table(name = "shift_sessions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShiftSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String cashierUsername;

    @Column(nullable = false)
    @Builder.Default
    private Double openingFloat = 0.0;   // Cash in drawer at shift start

    private Double closingCash;          // Actual cash counted at shift end
    private Double expectedCash;         // Calculated: openingFloat + cash sales
    private Double variance;             // closingCash - expectedCash (positive = over, negative = short)

    private Double totalSales;           // Total revenue during shift
    private Double mpesaSales;           // M-Pesa portion
    private Double cashSales;            // Cash portion
    private Integer transactionCount;

    @Builder.Default
    private String status = "OPEN";      // OPEN | CLOSED

    @Builder.Default
    private LocalDateTime openedAt = LocalDateTime.now();

    private LocalDateTime closedAt;

    private String notes;                // Manager notes on variance
    private String branchCode;
}
