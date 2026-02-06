package com.pos.model;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class VerificationData {
    private String transactionId;
    private String businessName;
    private LocalDateTime timestamp;
    private Double amount;
    private String status;
}
