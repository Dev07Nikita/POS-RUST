package com.pos.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pos.dto.MpesaCheckoutRequest;
import com.pos.dto.MpesaCheckoutResponse;
import com.pos.dto.MpesaStkCallbackDto;
import com.pos.model.MpesaTransaction;
import com.pos.model.Sale;
import com.pos.repository.MpesaTransactionRepository;
import com.pos.service.MpesaService;
import com.pos.service.SaleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/mpesa")
@RequiredArgsConstructor
@Slf4j
public class MpesaController {

    private final MpesaService mpesaService;
    private final SaleService saleService;
    private final MpesaTransactionRepository transactionRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Initiate M-Pesa STK Push checkout. Creates a PENDING sale, triggers STK Push,
     * and returns checkout details. Stock is deducted when M-Pesa callback confirms
     * success.
     */
    @PostMapping("/checkout")
    public ResponseEntity<?> checkout(@Valid @RequestBody MpesaCheckoutRequest request) {
        try {
            Sale sale = saleService.createSaleForMpesa(request.getCustomerPhone(), request.getItems());
            MpesaTransaction transaction = mpesaService.triggerStkPush(sale);

            MpesaCheckoutResponse response = MpesaCheckoutResponse.builder()
                    .transactionId(sale.getTransactionId())
                    .checkoutRequestId(transaction.getCheckoutRequestId())
                    .merchantRequestId(transaction.getMerchantRequestId())
                    .customerMessage("STK Push sent to " + request.getCustomerPhone()
                            + ". Please complete payment on your phone.")
                    .build();

            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.warn("M-Pesa checkout failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * STK Push callback endpoint - receives payment status from M-Pesa
     */
    @PostMapping("/callback")
    public ResponseEntity<Map<String, Object>> handleStkCallback(@RequestBody String payload) {
        log.info("M-Pesa STK Callback Received");
        log.debug("Callback Payload: {}", payload);

        try {
            // Parse callback JSON
            MpesaStkCallbackDto callback = objectMapper.readValue(payload, MpesaStkCallbackDto.class);

            // Process callback asynchronously to respond quickly to M-Pesa
            mpesaService.processStkCallback(callback, payload);

            // Respond to M-Pesa immediately
            Map<String, Object> response = new HashMap<>();
            response.put("ResultCode", 0);
            response.put("ResultDesc", "Accepted");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error processing M-Pesa callback: {}", e.getMessage(), e);

            // Still respond with success to M-Pesa to avoid retries
            Map<String, Object> response = new HashMap<>();
            response.put("ResultCode", 0);
            response.put("ResultDesc", "Accepted");

            return ResponseEntity.ok(response);
        }
    }

    /**
     * C2B Validation endpoint - validates incoming C2B payments
     */
    @PostMapping("/callback/validation")
    public ResponseEntity<Map<String, Object>> validateC2B(@RequestBody String payload) {
        log.info("M-Pesa C2B Validation Request");
        log.debug("Validation Payload: {}", payload);

        // Accept all C2B payments by default
        Map<String, Object> response = new HashMap<>();
        response.put("ResultCode", 0);
        response.put("ResultDesc", "Accepted");

        return ResponseEntity.ok(response);
    }

    /**
     * C2B Confirmation endpoint - confirms C2B payment received
     */
    @PostMapping("/callback/confirmation")
    public ResponseEntity<Map<String, Object>> confirmC2B(@RequestBody String payload) {
        log.info("M-Pesa C2B Confirmation Received");
        log.debug("Confirmation Payload: {}", payload);

        // TODO: Process C2B payment and create transaction record

        Map<String, Object> response = new HashMap<>();
        response.put("ResultCode", 0);
        response.put("ResultDesc", "Accepted");

        return ResponseEntity.ok(response);
    }

    /**
     * Register C2B URLs with M-Pesa (v2 endpoint).
     * Triggers POST /mpesa/c2b/v2/registerurl on Safaricom Daraja API.
     * Call this endpoint once to register your confirmation/validation URLs.
     */
    @GetMapping("/register")
    public ResponseEntity<String> registerUrls() {
        try {
            String result = mpesaService.registerUrls();
            return ResponseEntity.ok("C2B URLs Registered Successfully: " + result);
        } catch (Exception e) {
            log.error("URL registration failed: {}", e.getMessage());
            return ResponseEntity.internalServerError().body("Registration failed: " + e.getMessage());
        }
    }

    /**
     * Query transaction status manually
     */
    @GetMapping("/status/{checkoutRequestId}")
    public ResponseEntity<MpesaTransaction> queryStatus(@PathVariable String checkoutRequestId) {
        try {
            mpesaService.queryTransactionStatus(checkoutRequestId);

            MpesaTransaction transaction = transactionRepository
                    .findByCheckoutRequestId(checkoutRequestId)
                    .orElseThrow(() -> new RuntimeException("Transaction not found"));

            return ResponseEntity.ok(transaction);
        } catch (Exception e) {
            log.error("Status query failed: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Get transaction by checkout request ID
     */
    @GetMapping("/transaction/{checkoutRequestId}")
    public ResponseEntity<MpesaTransaction> getTransaction(@PathVariable String checkoutRequestId) {
        return transactionRepository.findByCheckoutRequestId(checkoutRequestId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
