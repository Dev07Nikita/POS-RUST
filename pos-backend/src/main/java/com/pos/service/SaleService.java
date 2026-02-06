package com.pos.service;

import com.pos.model.Sale;
import com.pos.model.SaleItem;
import com.pos.model.Product;
import com.pos.repository.SaleRepository;
import com.pos.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SaleService {
    private final SaleRepository saleRepository;
    private final ProductRepository productRepository;

    @Transactional
    public Sale processSale(Sale sale) {
        sale.setTransactionId(UUID.randomUUID().toString());
        sale.setTimestamp(LocalDateTime.now());
        sale.setPaymentStatus("PENDING");

        // Update stock levels
        for (SaleItem item : sale.getItems()) {
            Product product = productRepository.findById(item.getProduct().getId())
                    .orElseThrow(() -> new RuntimeException("Product not found: " + item.getProduct().getId()));

            if (product.getStockQuantity() < item.getQuantity()) {
                throw new RuntimeException("Insufficient stock for: " + product.getName());
            }

            product.setStockQuantity(product.getStockQuantity() - item.getQuantity());
            productRepository.save(product);

            item.setUnitPrice(product.getPrice());
            item.setSubtotal(product.getPrice() * item.getQuantity());
        }

        sale.setTotalAmount(sale.getItems().stream().mapToDouble(SaleItem::getSubtotal).sum());

        Sale savedSale = saleRepository.save(sale);

        // Logic for triggering M-Pesa STK push would go here if paymentMethod is M-PESA
        if ("M-PESA".equalsIgnoreCase(sale.getPaymentMethod())) {
            // triggerMpesaStkPush(savedSale);
        }

        return savedSale;
    }
}
