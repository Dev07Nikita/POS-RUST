package com.pos.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "sales")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Sale {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String transactionId; // Unique ref

    private LocalDateTime timestamp;

    private Double totalAmount;

    private Double discountAmount; // NEW — flat discount applied

    private String discountType; // NEW — "PERCENT" or "FIXED"

    private Double finalAmount; // NEW — totalAmount - discountAmount

    private String paymentMethod; // M-PESA, CASH, BANK

    private String status; // PENDING, SUCCESS, FAILED, REFUNDED, HELD

    private String customerPhone; // For M-Pesa STK push

    private Long customerId; // NEW — link to Customer CRM record

    private String customerName; // NEW — snapshot at time of sale

    private String cashierUsername; // NEW — which cashier processed this

    private String notes; // NEW — order notes / special instructions

    @Builder.Default
    private Boolean isRefunded = false; // NEW — refund flag

    private LocalDateTime refundedAt; // NEW — when it was refunded

    @OneToMany(cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    @JoinColumn(name = "sale_id")
    private List<SaleItem> items;
}
