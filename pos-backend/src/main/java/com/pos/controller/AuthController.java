package com.pos.controller;

import com.pos.model.User;
import com.pos.service.AuthService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import com.pos.model.AuditLog;
import com.pos.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = { "http://localhost:3000", "http://127.0.0.1:3000" })
public class AuthController {
    private final AuthService authService;
    private final AuditLogRepository auditLogRepository;

    /**
     * User login endpoint
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        log.info("Login attempt for user: {} from IP: {}", request.getUsername(), getClientIp(httpRequest));

        Optional<User> user = authService.login(request.getUsername(), request.getPassword());

        if (user.isPresent()) {
            User loggedInUser = user.get();

            // Don't send password back to client
            loggedInUser.setPassword(null);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Login successful");
            response.put("user", loggedInUser);

            return ResponseEntity.ok(response);
        }

        // Log failed login attempt
        auditLogRepository.save(AuditLog.builder()
                .username(request.getUsername())
                .action("FAILED_LOGIN")
                .details("Failed login attempt")
                .ipAddress(getClientIp(httpRequest))
                .build());

        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("success", false);
        errorResponse.put("message", "Invalid username or password");

        return ResponseEntity.status(401).body(errorResponse);
    }

    /**
     * User registration endpoint
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        log.info("Registration attempt for user: {}", request.getUsername());

        try {
            // Default role to USER if not specified
            String role = (request.getRole() == null || request.getRole().isEmpty())
                    ? "USER"
                    : request.getRole();

            User user = authService.registerUser(
                    request.getUsername(),
                    request.getPassword(),
                    request.getEmail(),
                    request.getFullName(),
                    role);

            // Don't send password back to client
            user.setPassword(null);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Registration successful");
            response.put("user", user);

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", e.getMessage());

            return ResponseEntity.badRequest().body(errorResponse);

        } catch (Exception e) {
            log.error("Registration failed for user {}: {}", request.getUsername(), e.getMessage());

            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Registration failed. Please try again.");

            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }

    /**
     * Check if username is available
     */
    @GetMapping("/check-username/{username}")
    public ResponseEntity<?> checkUsername(@PathVariable String username) {
        boolean available = authService.isUsernameAvailable(username);

        Map<String, Object> response = new HashMap<>();
        response.put("available", available);
        response.put("message", available ? "Username is available" : "Username already taken");

        return ResponseEntity.ok(response);
    }

    /**
     * Check if email is available
     */
    @GetMapping("/check-email/{email}")
    public ResponseEntity<?> checkEmail(@PathVariable String email) {
        boolean available = authService.isEmailAvailable(email);

        Map<String, Object> response = new HashMap<>();
        response.put("available", available);
        response.put("message", available ? "Email is available" : "Email already registered");

        return ResponseEntity.ok(response);
    }

    /**
     * Forgot password - request reset code
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        log.info("Password reset requested for email: {}", request.getEmail());

        String result = authService.requestPasswordReset(request.getEmail());

        Map<String, Object> response = new HashMap<>();

        if ("CODE_SENT".equals(result)) {
            response.put("success", true);
            response.put("message", "Verification code sent to your email");
            return ResponseEntity.ok(response);
        }

        response.put("success", false);
        response.put("message", result);
        return ResponseEntity.badRequest().body(response);
    }

    /**
     * Reset password with verification code
     */
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        log.info("Password reset attempt for email: {}", request.getEmail());

        boolean success = authService.resetPassword(
                request.getEmail(),
                request.getCode(),
                request.getNewPassword());

        Map<String, Object> response = new HashMap<>();

        if (success) {
            response.put("success", true);
            response.put("message", "Password reset successfully");
            return ResponseEntity.ok(response);
        }

        response.put("success", false);
        response.put("message", "Invalid or expired verification code");
        return ResponseEntity.badRequest().body(response);
    }

    /**
     * Get audit logs for a user
     */
    @GetMapping("/logs/{username}")
    public ResponseEntity<?> getLogs(@PathVariable String username) {
        return ResponseEntity.ok(authService.getLogs(username));
    }

    /**
     * Logout endpoint
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestBody Map<String, String> body, HttpServletRequest httpRequest) {
        String username = body.get("username");
        log.info("User logged out: {}", username);

        // Log the logout event
        auditLogRepository.save(AuditLog.builder()
                .username(username)
                .action("LOGOUT")
                .details("User logged out")
                .ipAddress(getClientIp(httpRequest))
                .build());

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Logged out successfully");

        return ResponseEntity.ok(response);
    }

    /**
     * Get ALL audit logs (admin only)
     */
    @GetMapping("/logs/all")
    public ResponseEntity<?> getAllLogs() {
        List<AuditLog> logs = auditLogRepository.findAll(
                org.springframework.data.domain.Sort.by(
                        org.springframework.data.domain.Sort.Direction.DESC, "timestamp"));
        return ResponseEntity.ok(logs);
    }

    /**
     * Get all registered users (admin)
     */
    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers() {
        var users = authService.getAllUsers();
        // Remove passwords before sending
        users.forEach(u -> u.setPassword(null));
        return ResponseEntity.ok(users);
    }

    /**
     * Extract client IP address
     */
    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}

// DTOs with validation

@Data
class LoginRequest {
    @NotBlank(message = "Username is required")
    private String username;

    @NotBlank(message = "Password is required")
    private String password;
}

@Data
class RegisterRequest {
    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
    private String username;

    @NotBlank(message = "Password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;

    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Full name is required")
    private String fullName;

    private String role; // Optional, defaults to USER
}

@Data
class ForgotPasswordRequest {
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;
}

@Data
class ResetPasswordRequest {
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Verification code is required")
    private String code;

    @NotBlank(message = "New password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    private String newPassword;
}
