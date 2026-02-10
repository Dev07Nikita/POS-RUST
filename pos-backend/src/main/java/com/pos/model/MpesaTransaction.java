package com.pos.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "mpesa_transactions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MpesaTransaction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String merchantRequestId; // From M-Pesa STK Push response

    @Column(unique = true)
    private String checkoutRequestId; // From M-Pesa STK Push response

    @Column(unique = true)
    private String mpesaReceiptNumber; // From callback (success only)

    @ManyToOne
    @JoinColumn(name = "sale_id")
    private Sale sale;

    private String phoneNumber;

    private Double amount;

    @Enumerated(EnumType.STRING)
    private TransactionStatus status; // INITIATED, PENDING, SUCCESS, FAILED, TIMEOUT

    @Enumerated(EnumType.STRING)
    private TransactionType type; // STK_PUSH, C2B, B2C

    private String resultCode; // From M-Pesa callback

    private String resultDescription; // From M-Pesa callback

    private LocalDateTime initiatedAt;

    private LocalDateTime completedAt;

    private LocalDateTime expiresAt; // For timeout handling (90 seconds)

    @Column(length = 2000)
    private String rawCallback; // Store full callback JSON for debugging

    public enum TransactionStatus {
        INITIATED, // STK Push sent
        PENDING, // Waiting for user response
        SUCCESS, // Payment confirmed
        FAILED, // Payment failed/cancelled
        TIMEOUT // No response within 90 seconds
    }

    public enum TransactionType {
        STK_PUSH, // Lipa na M-Pesa Online
        C2B, // Customer to Business
        B2C // Business to Customer
    }

    public boolean isExpired() {
        return expiresAt != null && LocalDateTime.now().isAfter(expiresAt);
    }

    public boolean isPending() {
        return status == TransactionStatus.PENDING || status == TransactionStatus.INITIATED;
    }
}
