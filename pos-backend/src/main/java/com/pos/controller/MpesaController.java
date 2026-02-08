package com.pos.controller;

import com.pos.service.MpesaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/mpesa")
@RequiredArgsConstructor
@Slf4j
public class MpesaController {

    private final MpesaService mpesaService;

    @PostMapping("/callback")
    public void handleStkCallback(@RequestBody String payload) {
        log.info("M-Pesa STK Callback Received: {}", payload);
        // Logic to update sale status based on payload
    }

    @PostMapping("/callback/validation")
    public String validateC2B(@RequestBody String payload) {
        log.info("M-Pesa C2B Validation Request: {}", payload);
        // Return Accept or Reject
        return "{\"ResultCode\":0, \"ResultDesc\":\"Accepted\"}";
    }

    @PostMapping("/callback/confirmation")
    public void confirmC2B(@RequestBody String payload) {
        log.info("M-Pesa C2B Confirmation Received: {}", payload);
        // Logic to record the C2B payment in database
    }

    @GetMapping("/register")
    public String registerUrls() {
        mpesaService.registerUrls();
        return "C2B URLs Registration Initiated";
    }
}
