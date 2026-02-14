package com.pos.config;

import com.pos.model.Role;
import com.pos.model.User;
import com.pos.model.AuditLog;
import com.pos.repository.RoleRepository;
import com.pos.repository.UserRepository;
import com.pos.repository.AuditLogRepository;
import com.pos.util.PasswordUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Set;

/**
 * Seeds default roles and admin user on first startup.
 * If admin already exists, this does nothing.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {
    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;
    private final PasswordUtil passwordUtil;

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

        // Seed default admin user if no users exist
        if (userRepository.count() == 0) {
            Role adminRole = roleRepository.findByName("ADMIN").orElseThrow();
            Role managerRole = roleRepository.findByName("MANAGER").orElseThrow();

            Set<Role> adminRoles = new HashSet<>();
            adminRoles.add(adminRole);
            adminRoles.add(managerRole);

            User admin = User.builder()
                    .username("admin")
                    .password(passwordUtil.hashPassword("admin123"))
                    .fullName("System Administrator")
                    .email("admin@safipos.com")
                    .enabled(true)
                    .roles(adminRoles)
                    .build();

            userRepository.save(admin);

            // Create a default cashier user too
            Role cashierRole = roleRepository.findByName("CASHIER").orElseThrow();
            Set<Role> cashierRoles = new HashSet<>();
            cashierRoles.add(cashierRole);

            User cashier = User.builder()
                    .username("cashier")
                    .password(passwordUtil.hashPassword("cashier123"))
                    .fullName("Default Cashier")
                    .email("cashier@safipos.com")
                    .enabled(true)
                    .roles(cashierRoles)
                    .build();

            userRepository.save(cashier);

            auditLogRepository.save(AuditLog.builder()
                    .username("SYSTEM")
                    .action("INIT")
                    .details("Default admin and cashier accounts created on first startup")
                    .build());

            log.info("==============================================");
            log.info("  DEFAULT USERS CREATED:");
            log.info("  Admin    → admin / admin123");
            log.info("  Cashier  → cashier / cashier123");
            log.info("  Change passwords after first login!");
            log.info("==============================================");
        } else {
            log.info("Users already exist, skipping default user creation");
        }
    }
}
