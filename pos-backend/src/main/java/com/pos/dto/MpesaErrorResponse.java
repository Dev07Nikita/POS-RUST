package com.pos.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MpesaErrorResponse {
    private String errorCode;
    private String errorMessage;
    private String userMessage;
    private boolean retryable;

    public static MpesaErrorResponse fromResultCode(String resultCode, String resultDesc) {
        return switch (resultCode) {
            case "0" -> new MpesaErrorResponse("SUCCESS", resultDesc, "Payment successful", false);
            case "1032" -> new MpesaErrorResponse("USER_CANCELLED", resultDesc,
                    "Payment cancelled. Please try again.", true);
            case "1037" -> new MpesaErrorResponse("DS_TIMEOUT", resultDesc,
                    "Unable to reach your phone. Please check your network and try again.", true);
            case "1019" -> new MpesaErrorResponse("TRANSACTION_EXPIRED", resultDesc,
                    "Transaction expired. Please try again.", true);
            case "1025" -> new MpesaErrorResponse("PUSH_REQUEST_ERROR", resultDesc,
                    "Unable to process request. Please try again.", true);
            case "2001" -> new MpesaErrorResponse("INVALID_INITIATOR", resultDesc,
                    "System error. Please contact support.", false);
            case "1" -> new MpesaErrorResponse("INSUFFICIENT_BALANCE", resultDesc,
                    "Insufficient balance. Please top up and try again.", true);
            case "1001" -> new MpesaErrorResponse("INVALID_PIN", resultDesc,
                    "Invalid PIN entered. Please try again.", true);
            default -> new MpesaErrorResponse("UNKNOWN_ERROR", resultDesc,
                    "Payment failed. Please try again or use another payment method.", true);
        };
    }
}
