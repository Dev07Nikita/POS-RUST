package com.pos.service;

import com.pos.model.MpesaTransaction;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentNotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Send real-time payment status update to connected clients
     */
    public void notifyPaymentStatus(MpesaTransaction transaction) {
        String destination = "/topic/payment/" + transaction.getSale().getTransactionId();

        Map<String, Object> notification = new HashMap<>();
        notification.put("transactionId", transaction.getSale().getTransactionId());
        notification.put("checkoutRequestId", transaction.getCheckoutRequestId());
        notification.put("status", transaction.getStatus().toString());
        notification.put("amount", transaction.getAmount());
        notification.put("phoneNumber", transaction.getPhoneNumber());
        notification.put("mpesaReceiptNumber", transaction.getMpesaReceiptNumber());
        notification.put("resultCode", transaction.getResultCode());
        notification.put("resultDescription", transaction.getResultDescription());
        notification.put("timestamp", transaction.getCompletedAt() != null
                ? transaction.getCompletedAt().toString()
                : transaction.getInitiatedAt().toString());

        log.info("Sending WebSocket notification to {}: Status={}", destination, transaction.getStatus());
        messagingTemplate.convertAndSend(destination, notification);
    }

    /**
     * Send general payment notification to all connected clients
     */
    public void broadcastPaymentUpdate(String transactionId, String status, String message) {
        Map<String, Object> notification = new HashMap<>();
        notification.put("transactionId", transactionId);
        notification.put("status", status);
        notification.put("message", message);
        notification.put("timestamp", System.currentTimeMillis());

        log.info("Broadcasting payment update: TransactionID={}, Status={}", transactionId, status);
        messagingTemplate.convertAndSend("/topic/payments", notification);
    }
}
