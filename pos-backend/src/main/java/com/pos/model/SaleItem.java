package com.pos.model;

import jakarta.persistence.*;

/**
 * Represents a single line item within a Sale.
 * Uses explicit getters/setters/builder instead of Lombok to avoid
 * IDE annotation-processing issues (Eclipse, VS Code, IntelliJ).
 */
@Entity
@Table(name = "sale_items")
public class SaleItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "product_id")
    private Product product;

    private String productName; // snapshot name at time of sale
    private Integer quantity;
    private Double unitPrice;
    private Double costPrice; // snapshot cost price at time of sale
    private Double subtotal;

    // ── JPA required no-arg constructor ──────────────────────────────────────
    public SaleItem() {
    }

    // ── All-arg constructor ───────────────────────────────────────────────────
    public SaleItem(Long id, Product product, String productName,
            Integer quantity, Double unitPrice, Double costPrice, Double subtotal) {
        this.id = id;
        this.product = product;
        this.productName = productName;
        this.quantity = quantity;
        this.unitPrice = unitPrice;
        this.costPrice = costPrice;
        this.subtotal = subtotal;
    }

    // ── Getters ───────────────────────────────────────────────────────────────
    public Long getId() {
        return id;
    }

    public Product getProduct() {
        return product;
    }

    public String getProductName() {
        return productName;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public Double getUnitPrice() {
        return unitPrice;
    }

    public Double getCostPrice() {
        return costPrice;
    }

    public Double getSubtotal() {
        return subtotal;
    }

    // ── Setters ───────────────────────────────────────────────────────────────
    public void setId(Long id) {
        this.id = id;
    }

    public void setProduct(Product product) {
        this.product = product;
    }

    public void setProductName(String n) {
        this.productName = n;
    }

    public void setQuantity(Integer qty) {
        this.quantity = qty;
    }

    public void setUnitPrice(Double p) {
        this.unitPrice = p;
    }

    public void setCostPrice(Double costPrice) {
        this.costPrice = costPrice;
    }

    public void setSubtotal(Double subtotal) {
        this.subtotal = subtotal;
    }

    // ── Builder (replaces Lombok @Builder) ───────────────────────────────────
    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private Long id;
        private Product product;
        private String productName;
        private Integer quantity;
        private Double unitPrice;
        private Double costPrice;
        private Double subtotal;

        public Builder id(Long id) {
            this.id = id;
            return this;
        }

        public Builder product(Product p) {
            this.product = p;
            return this;
        }

        public Builder productName(String n) {
            this.productName = n;
            return this;
        }

        public Builder quantity(Integer qty) {
            this.quantity = qty;
            return this;
        }

        public Builder unitPrice(Double p) {
            this.unitPrice = p;
            return this;
        }

        public Builder costPrice(Double costPrice) {
            this.costPrice = costPrice;
            return this;
        }

        public Builder subtotal(Double subtotal) {
            this.subtotal = subtotal;
            return this;
        }

        public SaleItem build() {
            return new SaleItem(id, product, productName, quantity, unitPrice, costPrice, subtotal);
        }
    }

    @Override
    public String toString() {
        return "SaleItem{id=" + id + ", productName='" + productName +
                "', qty=" + quantity + ", unitPrice=" + unitPrice +
                ", costPrice=" + costPrice + ", subtotal=" + subtotal + "}";
    }
}
