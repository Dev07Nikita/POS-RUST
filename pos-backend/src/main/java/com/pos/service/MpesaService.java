package com.pos.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.text.SimpleDateFormat;
import java.util.Date;

@Service
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

    private final RestTemplate restTemplate = new RestTemplate();

    public String getAccessToken() {
        String auth = consumerKey + ":" + consumerSecret;
        String encodedAuth = Base64.getEncoder().encodeToString(auth.getBytes());

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Basic " + encodedAuth);

        HttpEntity<String> entity = new HttpEntity<>(headers);
        ResponseEntity<Map> response = restTemplate.exchange(
                "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
                HttpMethod.GET, entity, Map.class);

        return (String) response.getBody().get("access_token");
    }

    public void triggerStkPush(String phoneNumber, Double amount, String reference) {
        log.info("Triggering M-Pesa STK Push for {} - Amount: KES {}", phoneNumber, amount);

        try {
            String token = getAccessToken();
            String timestamp = new SimpleDateFormat("yyyyMMddHHmmss").format(new Date());
            String password = Base64.getEncoder().encodeToString((shortCode + passkey + timestamp).getBytes());

            Map<String, Object> body = new HashMap<>();
            body.put("BusinessShortCode", shortCode);
            body.put("Password", password);
            body.put("Timestamp", timestamp);
            body.put("TransactionType", "CustomerPayBillOnline");
            body.put("Amount", amount.intValue());
            body.put("PartyA", phoneNumber);
            body.put("PartyB", shortCode);
            body.put("PhoneNumber", phoneNumber);
            body.put("CallBackURL", callbackUrl);
            body.put("AccountReference", reference);
            body.put("TransactionDesc", "Payment for Safi POS Order");

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(token);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(
                    "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
                    entity, String.class);

            log.info("STK Push Response: {}", response.getBody());
        } catch (Exception e) {
            log.error("STK Push Failed: {}", e.getMessage());
        }
    }

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
            restTemplate.postForEntity("https://sandbox.safaricom.co.ke/mpesa/c2b/v1/registerurl", entity,
                    String.class);
            log.info("M-Pesa C2B URLs Registered");
        } catch (Exception e) {
            log.error("C2B Registration Failed: {}", e.getMessage());
        }
    }

    public void sendMoney(String phoneNumber, Double amount, String remarks) {
        log.info("Initiating M-Pesa B2C (Send Money) to {} - Amount: KES {}", phoneNumber, amount);
        // 1. Get OAuth Token
        // 2. Prepare B2C Payload (SecurityCredential,
        // CommandID=BusinessPayment/SalaryPayment, etc.)
        // 3. Call https://sandbox.safaricom.co.ke/mpesa/b2c/v1/paymentrequest
        log.warn("B2C Send Money requires dedicated B2C credentials and certificate encryption.");
    }
}
