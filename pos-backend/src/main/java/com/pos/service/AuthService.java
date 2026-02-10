package com.pos.service;

import com.pos.model.User;
import com.pos.model.Role;
import com.pos.model.AuditLog;
import com.pos.model.PasswordResetToken;
import com.pos.repository.UserRepository;
import com.pos.repository.RoleRepository;
import com.pos.repository.AuditLogRepository;
import com.pos.repository.PasswordResetTokenRepository;
import com.pos.util.PasswordUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Random;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final AuditLogRepository auditLogRepository;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final PasswordUtil passwordUtil;

    /**
     * Register a new user with hashed password
     */
    @Transactional
    public User registerUser(String username, String password, String email, String fullName, String roleName) {
        // Check if username already exists
        if (userRepository.findByUsername(username).isPresent()) {
            throw new IllegalArgumentException("Username already exists");
        }

        // Check if email already exists
        if (email != null && !email.isEmpty() && userRepository.findByEmail(email).isPresent()) {
            throw new IllegalArgumentException("Email already registered");
        }

        // Get or create role
        Role role = roleRepository.findByName(roleName)
                .orElseGet(() -> roleRepository.save(Role.builder().name(roleName).build()));

        Set<Role> roles = new HashSet<>();
        roles.add(role);

        // Hash the password
        String hashedPassword = passwordUtil.hashPassword(password);

        User user = User.builder()
                .username(username)
                .password(hashedPassword)
                .email(email)
                .fullName(fullName)
                .roles(roles)
                .enabled(true)
                .build();

        User saved = userRepository.save(user);

        auditLogRepository.save(AuditLog.builder()
                .username(username)
                .action("SIGNUP")
                .details("New account created as " + roleName)
                .build());

        log.info("User registered successfully: {}", username);
        return saved;
    }

    /**
     * Login with username and password verification
     */
    public Optional<User> login(String username, String password) {
        Optional<User> userOpt = userRepository.findByUsername(username);

        if (userOpt.isEmpty()) {
            log.warn("Login failed: User not found - {}", username);
            return Optional.empty();
        }

        User user = userOpt.get();

        // Verify password using BCrypt
        if (!passwordUtil.matches(password, user.getPassword())) {
            log.warn("Login failed: Invalid password for user - {}", username);
            return Optional.empty();
        }

        // Check if user is enabled
        if (!user.isEnabled()) {
            log.warn("Login failed: User account disabled - {}", username);
            return Optional.empty();
        }

        auditLogRepository.save(AuditLog.builder()
                .username(username)
                .action("LOGIN")
                .details("Successful system login")
                .build());

        log.info("User logged in successfully: {}", username);
        return Optional.of(user);
    }

    /**
     * Request password reset with email verification
     */
    @Transactional
    public String requestPasswordReset(String email) {
        Optional<User> user = userRepository.findByEmail(email);
        if (user.isEmpty()) {
            log.warn("Password reset requested for non-existent email: {}", email);
            return "Email not found";
        }

        String code = String.format("%06d", new Random().nextInt(999999));
        resetTokenRepository.deleteByEmail(email);
        resetTokenRepository.save(PasswordResetToken.builder()
                .email(email)
                .code(code)
                .expiryDate(LocalDateTime.now().plusMinutes(15))
                .build());

        log.info("Password reset code generated for email: {} (Code: {})", email, code);
        // In a real app: mailSender.send(...)
        return "CODE_SENT";
    }

    /**
     * Reset password with verification code
     */
    @Transactional
    public boolean resetPassword(String email, String code, String newPassword) {
        Optional<PasswordResetToken> token = resetTokenRepository.findByEmailAndCode(email, code);

        if (token.isEmpty()) {
            log.warn("Password reset failed: Invalid code for email {}", email);
            return false;
        }

        if (token.get().isExpired()) {
            log.warn("Password reset failed: Expired code for email {}", email);
            return false;
        }

        User user = userRepository.findByEmail(email).orElseThrow();

        // Hash the new password
        String hashedPassword = passwordUtil.hashPassword(newPassword);
        user.setPassword(hashedPassword);
        userRepository.save(user);

        resetTokenRepository.deleteByEmail(email);

        auditLogRepository.save(AuditLog.builder()
                .username(user.getUsername())
                .action("RESET_PASSWORD")
                .details("Password changed via email verification")
                .build());

        log.info("Password reset successful for user: {}", user.getUsername());
        return true;
    }

    /**
     * Get audit logs for a user
     */
    public List<AuditLog> getLogs(String username) {
        return auditLogRepository.findByUsernameOrderByTimestampDesc(username);
    }

    /**
     * Check if username is available
     */
    public boolean isUsernameAvailable(String username) {
        return userRepository.findByUsername(username).isEmpty();
    }

    /**
     * Check if email is available
     */
    public boolean isEmailAvailable(String email) {
        return userRepository.findByEmail(email).isEmpty();
    }
}
