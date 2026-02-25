package com.pos.config;

import com.pos.model.Product;
import com.pos.model.Role;
import com.pos.repository.ProductRepository;
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
    private final ProductRepository productRepository;

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

        // Seed sample products if none exist (for POS UI and analytics)
        if (productRepository.count() == 0) {
            productRepository.save(Product.builder().code("001").name("Tindi Coffee").price(250.0).costPrice(180.0).stockQuantity(50).category("Drinks").build());
            productRepository.save(Product.builder().code("002").name("Premium Tea").price(150.0).costPrice(90.0).stockQuantity(80).category("Drinks").build());
            productRepository.save(Product.builder().code("003").name("Glazed Donut").price(100.0).costPrice(45.0).stockQuantity(30).category("Snacks").build());
            productRepository.save(Product.builder().code("004").name("Beef Burger").price(450.0).costPrice(280.0).stockQuantity(20).category("Food").build());
            log.info("Seeded 4 sample products with cost data");
        }
    }
}
