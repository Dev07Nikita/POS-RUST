package com.pos.service;

import com.pos.dto.CartItemDto;
import com.pos.model.AuditLog;
import com.pos.model.Sale;
import com.pos.model.SaleItem;
import com.pos.model.Product;
import com.pos.repository.AuditLogRepository;
import com.pos.repository.SaleRepository;
import com.pos.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SaleService {
    private final SaleRepository saleRepository;
    private final ProductRepository productRepository;
    private final AuditLogRepository auditLogRepository;

    @Transactional
    public Sale processSale(Sale sale) {
        sale.setTransactionId(UUID.randomUUID().toString());
        sale.setTimestamp(LocalDateTime.now());
        sale.setStatus("PENDING");

        // Update stock levels
        for (SaleItem item : sale.getItems()) {
            if (item.getProduct() == null || item.getProduct().getId() == null) {
                throw new RuntimeException("Product ID is required for each item");
            }
            Product product = productRepository.findById(item.getProduct().getId())
                    .orElseThrow(() -> new RuntimeException("Product not found: " + item.getProduct().getId()));

            if (product.getStockQuantity() < item.getQuantity()) {
                throw new RuntimeException("Insufficient stock for: " + product.getName() + ". Available: " + product.getStockQuantity());
            }

            product.setStockQuantity(product.getStockQuantity() - item.getQuantity());
            productRepository.save(product);

            item.setProduct(product);
            item.setProductName(product.getName());
            item.setUnitPrice(product.getPrice());
            item.setSubtotal(product.getPrice() * item.getQuantity());
        }

        sale.setTotalAmount(sale.getItems().stream().mapToDouble(SaleItem::getSubtotal).sum());

        Sale savedSale = saleRepository.save(sale);

        // Cash sales are complete immediately; analytics will pick them up
        if ("CASH".equalsIgnoreCase(sale.getPaymentMethod())) {
            savedSale.setStatus("SUCCESS");
            saleRepository.save(savedSale);
            auditLogRepository.save(AuditLog.builder()
                    .username("POS")
                    .action("SALE")
                    .details("CASH sale " + savedSale.getTransactionId() + " KES " + savedSale.getTotalAmount())
                    .ipAddress(null)
                    .build());
        }

        return savedSale;
    }

    /**
     * Create a sale for M-Pesa checkout without deducting stock.
     * Stock is deducted only when M-Pesa callback confirms success.
     */
    @Transactional
    public Sale createSaleForMpesa(String customerPhone, List<CartItemDto> items) {
        List<SaleItem> saleItems = new ArrayList<>();
        double totalAmount = 0;

        for (CartItemDto dto : items) {
            Product product = productRepository.findById(dto.getProductId())
                    .orElseThrow(() -> new RuntimeException("Product not found: " + dto.getProductId()));

            if (product.getStockQuantity() < dto.getQuantity()) {
                throw new RuntimeException("Insufficient stock for: " + product.getName() + ". Available: " + product.getStockQuantity());
            }

            double unitPrice = product.getPrice();
            double subtotal = unitPrice * dto.getQuantity();
            totalAmount += subtotal;

            SaleItem item = SaleItem.builder()
                    .product(product)
                    .productName(product.getName())
                    .quantity(dto.getQuantity())
                    .unitPrice(unitPrice)
                    .subtotal(subtotal)
                    .build();
            saleItems.add(item);
        }

        Sale sale = Sale.builder()
                .transactionId(UUID.randomUUID().toString())
                .timestamp(LocalDateTime.now())
                .totalAmount(totalAmount)
                .paymentMethod("M-PESA")
                .status("PENDING")
                .customerPhone(normalizePhone(customerPhone))
                .items(saleItems)
                .build();

        return saleRepository.save(sale);
    }

    private static String normalizePhone(String phone) {
        if (phone == null) return null;
        String digits = phone.replaceAll("\\D", "");
        if (digits.startsWith("254")) return digits;
        if (digits.startsWith("0")) return "254" + digits.substring(1);
        if (digits.length() == 9) return "254" + digits;
        return digits;
    }
}
