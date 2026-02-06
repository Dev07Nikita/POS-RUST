package com.pos.service;

import com.pos.model.Sale;
import com.pos.model.SaleItem;
import org.springframework.stereotype.Service;

@Service
public class ReceiptService {
    
    public String generateTextReceipt(Sale sale) {
        StringBuilder receipt = new StringBuilder();
        receipt.append("      SAFI POS RETAIL      \n");
        receipt.append("---------------------------\n");
        receipt.append("Receipt ID: ").append(sale.getTransactionId().substring(0, 8)).append("\n");
        receipt.append("Date: ").append(sale.getTimestamp()).append("\n");
        receipt.append("---------------------------\n");
        
        for (SaleItem item : sale.getItems()) {
            receipt.append(String.format("%-15s %2d x %6.2f\n", 
                item.getProduct().getName(), 
                item.getQuantity(), 
                item.getUnitPrice()));
        }
        
        receipt.append("---------------------------\n");
        receipt.append(String.format("TOTAL:          KES %8.2f\n", sale.getTotalAmount()));
        receipt.append("Payment: ").append(sale.getPaymentMethod()).append("\n");
        receipt.append("---------------------------\n");
        receipt.append("    ASANTE KWA KUKUJA    \n");
        
        return receipt.toString();
    }
}
