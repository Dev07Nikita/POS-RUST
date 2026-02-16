package com.pos.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pos.dto.*;
import com.pos.model.AuditLog;
import com.pos.model.MpesaTransaction;
import com.pos.model.Sale;
import com.pos.model.SaleItem;
import com.pos.model.Product;
import com.pos.repository.AuditLogRepository;
import com.pos.repository.MpesaTransactionRepository;
import com.pos.repository.ProductRepository;
import com.pos.repository.SaleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.text.SimpleDateFormat;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class MpesaService {

    @Value("${mpesa.consumer.key:YOUR_KEY}")
    private String consumerKey;

    @Value("${mpesa.consumer.secret:YOUR_SECRET}")
    private String consumerSecret;

    @Value("${mpesa.passkey:YOUR_PASSKEY}")
    private String passkey;

    @Value("${mpesa.shortcode:174379}")
    private String shortCode;

    @Value("${mpesa.callback.url:http://YOUR_HOST/api/mpesa/callback}")
    private String callbackUrl;

    @Value("${mpesa.environment:sandbox}")
    private String environment;

    private final RestTemplate restTemplate = new RestTemplate();
    private final MpesaTransactionRepository transactionRepository;
    private final SaleRepository saleRepository;
    private final ProductRepository productRepository;
    private final AuditLogRepository auditLogRepository;
    private final PaymentNotificationService notificationService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Token caching
    private String cachedToken;
    private LocalDateTime tokenExpiry;

    /**
     * Get OAuth access token with caching
     */
    public String getAccessToken() {
        // Return cached token if still valid
        if (cachedToken != null && tokenExpiry != null && LocalDateTime.now().isBefore(tokenExpiry)) {
            log.debug("Using cached M-Pesa access token");
            return cachedToken;
        }

        String auth = consumerKey + ":" + consumerSecret;
        String encodedAuth = Base64.getEncoder().encodeToString(auth.getBytes());

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Basic " + encodedAuth);

        HttpEntity<String> entity = new HttpEntity<>(headers);
        String url = getBaseUrl() + "/oauth/v1/generate?grant_type=client_credentials";

        try {
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
            cachedToken = (String) response.getBody().get("access_token");

            // Token expires in 3600 seconds, cache for 3500 to be safe
            tokenExpiry = LocalDateTime.now().plusSeconds(3500);

            log.info("M-Pesa access token obtained and cached");
            return cachedToken;
        } catch (Exception e) {
            log.error("Failed to get M-Pesa access token: {}", e.getMessage());
            throw new RuntimeException("M-Pesa authentication failed", e);
        }
    }

    /**
     * Trigger STK Push and create transaction record
     */
    public MpesaTransaction triggerStkPush(Sale sale) {
        log.info("Triggering M-Pesa STK Push for Sale {} - Phone: {} - Amount: KES {}",
                sale.getTransactionId(), sale.getCustomerPhone(), sale.getTotalAmount());

        try {
            String token = getAccessToken();
            String timestamp = new SimpleDateFormat("yyyyMMddHHmmss").format(new Date());
            String password = Base64.getEncoder().encodeToString((shortCode + passkey + timestamp).getBytes());

            Map<String, Object> body = new HashMap<>();
            body.put("BusinessShortCode", shortCode);
            body.put("Password", password);
            body.put("Timestamp", timestamp);
            body.put("TransactionType", "CustomerPayBillOnline");
            body.put("Amount", sale.getTotalAmount().intValue());
            body.put("PartyA", sale.getCustomerPhone());
            body.put("PartyB", shortCode);
            body.put("PhoneNumber", sale.getCustomerPhone());
            body.put("CallBackURL", callbackUrl);
            body.put("AccountReference", sale.getTransactionId());
            body.put("TransactionDesc", "Payment for POS Order " + sale.getTransactionId());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(token);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            String url = getBaseUrl() + "/mpesa/stkpush/v1/processrequest";

            ResponseEntity<MpesaStkResponseDto> response = restTemplate.postForEntity(
                    url, entity, MpesaStkResponseDto.class);

            MpesaStkResponseDto responseDto = response.getBody();
            log.info("STK Push Response: {}", responseDto);

            if (responseDto != null && responseDto.isSuccess()) {
                // Create transaction record
                MpesaTransaction transaction = MpesaTransaction.builder()
                        .merchantRequestId(responseDto.getMerchantRequestId())
                        .checkoutRequestId(responseDto.getCheckoutRequestId())
                        .sale(sale)
                        .phoneNumber(sale.getCustomerPhone())
                        .amount(sale.getTotalAmount())
                        .status(MpesaTransaction.TransactionStatus.PENDING)
                        .type(MpesaTransaction.TransactionType.STK_PUSH)
                        .initiatedAt(LocalDateTime.now())
                        .expiresAt(LocalDateTime.now().plusSeconds(90)) // 90 second timeout
                        .build();

                transaction = transactionRepository.save(transaction);

                // Update sale status
                sale.setStatus("PENDING");
                saleRepository.save(sale);

                log.info("M-Pesa transaction created: ID={}, CheckoutRequestID={}",
                        transaction.getId(), transaction.getCheckoutRequestId());

                return transaction;
            } else {
                throw new RuntimeException("STK Push failed: " +
                        (responseDto != null ? responseDto.getResponseDescription() : "Unknown error"));
            }

        } catch (Exception e) {
            log.error("STK Push Failed: {}", e.getMessage(), e);

            // Update sale to failed
            sale.setStatus("FAILED");
            saleRepository.save(sale);

            throw new RuntimeException("Failed to initiate M-Pesa payment", e);
        }
    }

    /**
     * Process STK Push callback from M-Pesa
     */
    public void processStkCallback(MpesaStkCallbackDto callback, String rawJson) {
        log.info("Processing M-Pesa callback: MerchantRequestID={}, ResultCode={}",
                callback.getMerchantRequestId(), callback.getResultCode());

        try {
            // Find transaction by checkout request ID
            MpesaTransaction transaction = transactionRepository
                    .findByCheckoutRequestId(callback.getCheckoutRequestId())
                    .orElseThrow(() -> new RuntimeException(
                            "Transaction not found for CheckoutRequestID: " + callback.getCheckoutRequestId()));

            // Update transaction with callback data
            transaction.setResultCode(String.valueOf(callback.getResultCode()));
            transaction.setResultDescription(callback.getResultDesc());
            transaction.setCompletedAt(LocalDateTime.now());
            transaction.setRawCallback(rawJson);

            if (callback.isSuccess()) {
                // Success - extract payment details
                transaction.setMpesaReceiptNumber(callback.getMpesaReceiptNumber());
                transaction.setStatus(MpesaTransaction.TransactionStatus.SUCCESS);

                // Update associated sale and deduct stock
                Sale sale = transaction.getSale();
                if (sale != null) {
                    sale.setStatus("SUCCESS");
                    saleRepository.save(sale);
                    // Deduct stock only on payment success
                    if (sale.getItems() != null) {
                        for (SaleItem item : sale.getItems()) {
                            if (item.getProduct() != null) {
                                Product product = productRepository.findById(item.getProduct().getId()).orElse(null);
                                if (product != null) {
                                    int newStock = Math.max(0, product.getStockQuantity() - item.getQuantity());
                                    product.setStockQuantity(newStock);
                                    productRepository.save(product);
                                    log.info("Stock updated for {}: -{} -> {}", product.getName(), item.getQuantity(), newStock);
                                }
                            }
                        }
                    }
                    log.info("Sale {} marked as SUCCESS", sale.getTransactionId());
                    auditLogRepository.save(AuditLog.builder()
                            .username("POS")
                            .action("SALE")
                            .details("M-PESA sale " + sale.getTransactionId() + " KES " + sale.getTotalAmount() + " Receipt " + callback.getMpesaReceiptNumber())
                            .ipAddress(null)
                            .build());
                }

                log.info("M-Pesa payment SUCCESS: Receipt={}, Amount={}",
                        callback.getMpesaReceiptNumber(), callback.getAmount());

                // Send real-time notification
                transactionRepository.save(transaction);
                notificationService.notifyPaymentStatus(transaction);

            } else {
                // Failed - map error code
                transaction.setStatus(MpesaTransaction.TransactionStatus.FAILED);

                MpesaErrorResponse error = MpesaErrorResponse.fromResultCode(
                        String.valueOf(callback.getResultCode()), callback.getResultDesc());

                // Update associated sale
                Sale sale = transaction.getSale();
                if (sale != null) {
                    sale.setStatus("FAILED");
                    saleRepository.save(sale);
                    log.info("Sale {} marked as FAILED: {}", sale.getTransactionId(), error.getUserMessage());
                }

                log.warn("M-Pesa payment FAILED: Code={}, Message={}",
                        error.getErrorCode(), error.getUserMessage());

                // Send real-time notification
                transactionRepository.save(transaction);
                notificationService.notifyPaymentStatus(transaction);
            }

        } catch (Exception e) {
            log.error("Error processing M-Pesa callback: {}", e.getMessage(), e);
            throw new RuntimeException("Callback processing failed", e);
        }
    }

    /**
     * Query transaction status from M-Pesa (for timeout/missing callback scenarios)
     */
    public void queryTransactionStatus(String checkoutRequestId) {
        log.info("Querying M-Pesa transaction status for CheckoutRequestID: {}", checkoutRequestId);

        try {
            String token = getAccessToken();
            String timestamp = new SimpleDateFormat("yyyyMMddHHmmss").format(new Date());
            String password = Base64.getEncoder().encodeToString((shortCode + passkey + timestamp).getBytes());

            Map<String, Object> body = new HashMap<>();
            body.put("BusinessShortCode", shortCode);
            body.put("Password", password);
            body.put("Timestamp", timestamp);
            body.put("CheckoutRequestID", checkoutRequestId);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(token);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            String url = getBaseUrl() + "/mpesa/stkpushquery/v1/query";

            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);

            log.info("Transaction status query response: {}", response.getBody());

            // Process the response similar to callback
            Map<String, Object> responseBody = response.getBody();
            if (responseBody != null) {
                String resultCode = String.valueOf(responseBody.get("ResultCode"));

                MpesaTransaction transaction = transactionRepository
                        .findByCheckoutRequestId(checkoutRequestId)
                        .orElse(null);

                if (transaction != null && transaction.isPending()) {
                    if ("0".equals(resultCode)) {
                        transaction.setStatus(MpesaTransaction.TransactionStatus.SUCCESS);
                        if (transaction.getSale() != null) {
                            transaction.getSale().setStatus("SUCCESS");
                            saleRepository.save(transaction.getSale());
                        }
                    } else {
                        transaction.setStatus(MpesaTransaction.TransactionStatus.TIMEOUT);
                        if (transaction.getSale() != null) {
                            transaction.getSale().setStatus("FAILED");
                            saleRepository.save(transaction.getSale());
                        }
                    }
                    transaction.setResultCode(resultCode);
                    transaction.setResultDescription(String.valueOf(responseBody.get("ResultDesc")));
                    transaction.setCompletedAt(LocalDateTime.now());
                    transactionRepository.save(transaction);
                }
            }

        } catch (Exception e) {
            log.error("Transaction status query failed: {}", e.getMessage(), e);
        }
    }

    /**
     * Scheduled task to check for expired transactions (runs every 30 seconds)
     */
    @Scheduled(fixedDelay = 30000)
    public void checkExpiredTransactions() {
        LocalDateTime now = LocalDateTime.now();

        var expiredTransactions = transactionRepository.findByStatusAndExpiresAtBefore(
                MpesaTransaction.TransactionStatus.PENDING, now);

        for (MpesaTransaction transaction : expiredTransactions) {
            log.warn("Transaction timeout detected: CheckoutRequestID={}",
                    transaction.getCheckoutRequestId());

            // Query M-Pesa for final status
            queryTransactionStatus(transaction.getCheckoutRequestId());
        }
    }

    /**
     * Register C2B URLs
     */
    public void registerUrls() {
        try {
            String token = getAccessToken();
            Map<String, Object> body = new HashMap<>();
            body.put("ShortCode", shortCode);
            body.put("ResponseType", "Completed");
            body.put("ConfirmationURL", callbackUrl + "/confirmation");
            body.put("ValidationURL", callbackUrl + "/validation");

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(token);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            String url = getBaseUrl() + "/mpesa/c2b/v1/registerurl";

            restTemplate.postForEntity(url, entity, String.class);
            log.info("M-Pesa C2B URLs Registered");
        } catch (Exception e) {
            log.error("C2B Registration Failed: {}", e.getMessage());
        }
    }

    /**
     * Get base URL based on environment
     */
    private String getBaseUrl() {
        return "sandbox".equalsIgnoreCase(environment)
                ? "https://sandbox.safaricom.co.ke"
                : "https://api.safaricom.co.ke";
    }
}
