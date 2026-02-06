package com.pos.controller;

import com.pos.model.User;
import com.pos.service.AuthService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        Optional<User> user = authService.login(request.getUsername(), request.getPassword());
        if (user.isPresent()) {
            return ResponseEntity.ok(user.get());
        }
        return ResponseEntity.status(401).body("Invalid credentials");
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        try {
            User user = authService.registerUser(request.getUsername(), request.getPassword(), request.getEmail(),
                    request.getRole());
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Registration failed: " + e.getMessage());
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody ForgotPasswordRequest request) {
        String result = authService.requestPasswordReset(request.getEmail());
        if ("CODE_SENT".equals(result))
            return ResponseEntity.ok("Verification code sent to your email");
        return ResponseEntity.badRequest().body(result);
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody ResetPasswordRequest request) {
        boolean success = authService.resetPassword(request.getEmail(), request.getCode(), request.getNewPassword());
        if (success)
            return ResponseEntity.ok("Password reset successfully");
        return ResponseEntity.badRequest().body("Invalid or expired code");
    }

    @GetMapping("/logs/{username}")
    public ResponseEntity<?> getLogs(@PathVariable String username) {
        return ResponseEntity.ok(authService.getLogs(username));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        // Log the logout action in audit logs
        return ResponseEntity.ok("Logged out successfully");
    }
}

@Data
class LoginRequest {
    private String username;
    private String password;
}

@Data
class RegisterRequest {
    private String username;
    private String password;
    private String email;
    private String role;
}

@Data
class ForgotPasswordRequest {
    private String email;
}

@Data
class ResetPasswordRequest {
    private String email;
    private String code;
    private String newPassword;
}
