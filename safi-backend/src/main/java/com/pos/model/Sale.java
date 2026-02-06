package com.pos.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

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

    private String transactionId;
    private String terminalId; // Which rust terminal sent this
    private LocalDateTime timestamp;
    private Double totalAmount;
    private String paymentMethod; // M-PESA, BANK_KCB, BANK_EQUITY, CASH
    private String cashierName;
    private String businessName;

    private String paymentReference; // Bank ref or M-Pesa receipt no.
    private String status; // PENDING, SUCCESS, FAILED
}
