package com.pos.config;

import com.pos.model.Role;
import com.pos.model.AuditLog;
import com.pos.repository.RoleRepository;
import com.pos.repository.UserRepository;
import com.pos.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Seeds default roles on startup.
 * Users register themselves through the frontend — no hardcoded passwords.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {
    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;

    @Override
    @Transactional
    public void run(String... args) {
        // Seed default roles
        String[] defaultRoles = { "ADMIN", "MANAGER", "CASHIER", "SALES", "LOGISTICS", "USER" };
        for (String roleName : defaultRoles) {
            roleRepository.findByName(roleName)
                    .orElseGet(() -> {
                        Role role = roleRepository.save(Role.builder().name(roleName).build());
                        log.info("Created role: {}", roleName);
                        return role;
                    });
        }

        // Log if no users exist — first user to register becomes admin
        if (userRepository.count() == 0) {
            log.info("==============================================");
            log.info("  NO USERS FOUND IN DATABASE");
            log.info("  First user to register will be assigned");
            log.info("  the ADMIN role automatically.");
            log.info("  Use the REGISTER form on the login screen.");
            log.info("==============================================");
        } else {
            log.info("{} user(s) found in database", userRepository.count());
        }
    }
}
