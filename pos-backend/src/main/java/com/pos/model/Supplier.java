package com.pos.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Supplier / vendor profile for purchase order management.
 * Matches Lightspeed, Square for Retail, and Shopify supplier management.
 */
@Entity
@Table(name = "suppliers")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Supplier {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String contactPerson;
    private String phone;
    private String email;
    private String address;
    private String taxPin;          // KRA PIN for VAT purposes

    @Builder.Default
    private Boolean active = true;

    @Builder.Default
    private Double totalOrderValue = 0.0;   // Cumulative purchase total

    @Builder.Default
    private Integer totalOrders = 0;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime lastOrderDate;
    private String notes;
}
