package com.pos.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MpesaCheckoutResponse {
    private String transactionId;
    private String checkoutRequestId;
    private String merchantRequestId;
    private String customerMessage;
}
