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

    private String paymentMethod; // M-PESA, CASH, BANK

    private String status; // PENDING, SUCCESS, FAILED

    private String customerPhone; // For M-Pesa STK push

    @OneToMany(cascade = CascadeType.ALL)
    @JoinColumn(name = "sale_id")
    private List<SaleItem> items;
}
