package com.pos.service;

import com.pos.model.User;
import com.pos.model.Role;
import com.pos.model.AuditLog;
import com.pos.model.PasswordResetToken;
import com.pos.repository.UserRepository;
import com.pos.repository.RoleRepository;
import com.pos.repository.AuditLogRepository;
import com.pos.repository.PasswordResetTokenRepository;
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

    public User registerUser(String username, String password, String email, String roleName) {
        Role role = roleRepository.findByName(roleName)
                .orElseGet(() -> roleRepository.save(Role.builder().name(roleName).build()));

        Set<Role> roles = new HashSet<>();
        roles.add(role);

        User user = User.builder()
                .username(username)
                .password(password)
                .email(email)
                .roles(roles)
                .enabled(true)
                .build();

        User saved = userRepository.save(user);
        auditLogRepository.save(AuditLog.builder()
                .username(username)
                .action("SIGNUP")
                .details("New account created as " + roleName)
                .build());
        return saved;
    }

    public Optional<User> login(String username, String password) {
        Optional<User> user = userRepository.findByUsername(username)
                .filter(u -> u.getPassword().equals(password));

        if (user.isPresent()) {
            auditLogRepository.save(AuditLog.builder()
                    .username(username)
                    .action("LOGIN")
                    .details("Successful system login")
                    .build());
        }
        return user;
    }

    @Transactional
    public String requestPasswordReset(String email) {
        Optional<User> user = userRepository.findByEmail(email);
        if (user.isEmpty())
            return "Email not found";

        String code = String.format("%06d", new Random().nextInt(999999));
        resetTokenRepository.deleteByEmail(email);
        resetTokenRepository.save(PasswordResetToken.builder()
                .email(email)
                .code(code)
                .expiryDate(LocalDateTime.now().plusMinutes(15))
                .build());

        log.info("Sending reset code {} to email {}", code, email);
        // In a real app: mailSender.send(...)
        return "CODE_SENT";
    }

    @Transactional
    public boolean resetPassword(String email, String code, String newPassword) {
        Optional<PasswordResetToken> token = resetTokenRepository.findByEmailAndCode(email, code);
        if (token.isPresent() && !token.get().isExpired()) {
            User user = userRepository.findByEmail(email).orElseThrow();
            user.setPassword(newPassword);
            userRepository.save(user);
            resetTokenRepository.deleteByEmail(email);

            auditLogRepository.save(AuditLog.builder()
                    .username(user.getUsername())
                    .action("RESET_PASSWORD")
                    .details("Password changed via email verification")
                    .build());
            return true;
        }
        return false;
    }

    public List<AuditLog> getLogs(String username) {
        return auditLogRepository.findByUsernameOrderByTimestampDesc(username);
    }
}
