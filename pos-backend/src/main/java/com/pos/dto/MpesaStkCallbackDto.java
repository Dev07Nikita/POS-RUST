package com.pos.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import com.fasterxml.jackson.annotation.JsonProperty;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MpesaStkCallbackDto {

    @JsonProperty("Body")
    private StkCallback body;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StkCallback {
        @JsonProperty("stkCallback")
        private StkCallbackData stkCallback;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StkCallbackData {
        @JsonProperty("MerchantRequestID")
        private String merchantRequestId;

        @JsonProperty("CheckoutRequestID")
        private String checkoutRequestId;

        @JsonProperty("ResultCode")
        private Integer resultCode;

        @JsonProperty("ResultDesc")
        private String resultDesc;

        @JsonProperty("CallbackMetadata")
        private CallbackMetadata callbackMetadata;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CallbackMetadata {
        @JsonProperty("Item")
        private java.util.List<MetadataItem> item;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MetadataItem {
        @JsonProperty("Name")
        private String name;

        @JsonProperty("Value")
        private Object value;
    }

    // Helper methods to extract data
    public String getMerchantRequestId() {
        return body != null && body.stkCallback != null ? body.stkCallback.merchantRequestId : null;
    }

    public String getCheckoutRequestId() {
        return body != null && body.stkCallback != null ? body.stkCallback.checkoutRequestId : null;
    }

    public Integer getResultCode() {
        return body != null && body.stkCallback != null ? body.stkCallback.resultCode : null;
    }

    public String getResultDesc() {
        return body != null && body.stkCallback != null ? body.stkCallback.resultDesc : null;
    }

    public String getMpesaReceiptNumber() {
        if (body == null || body.stkCallback == null || body.stkCallback.callbackMetadata == null) {
            return null;
        }
        return body.stkCallback.callbackMetadata.item.stream()
                .filter(item -> "MpesaReceiptNumber".equals(item.name))
                .map(item -> String.valueOf(item.value))
                .findFirst()
                .orElse(null);
    }

    public Double getAmount() {
        if (body == null || body.stkCallback == null || body.stkCallback.callbackMetadata == null) {
            return null;
        }
        return body.stkCallback.callbackMetadata.item.stream()
                .filter(item -> "Amount".equals(item.name))
                .map(item -> Double.valueOf(String.valueOf(item.value)))
                .findFirst()
                .orElse(null);
    }

    public String getPhoneNumber() {
        if (body == null || body.stkCallback == null || body.stkCallback.callbackMetadata == null) {
            return null;
        }
        return body.stkCallback.callbackMetadata.item.stream()
                .filter(item -> "PhoneNumber".equals(item.name))
                .map(item -> String.valueOf(item.value))
                .findFirst()
                .orElse(null);
    }

    public boolean isSuccess() {
        return getResultCode() != null && getResultCode() == 0;
    }
}
