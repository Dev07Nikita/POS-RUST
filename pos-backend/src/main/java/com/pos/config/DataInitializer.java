package com.pos.config;

import com.pos.model.Product;
import com.pos.model.Role;
import com.pos.repository.ProductRepository;
import com.pos.repository.RoleRepository;
import com.pos.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Seeds default roles and sample products on startup.
 * Branches are managed entirely from the frontend (no demo data).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

        private final RoleRepository roleRepository;
        private final UserRepository userRepository;
        private final ProductRepository productRepository;

        @Override
        @Transactional
        public void run(String... args) {

                // ── 1. Seed default roles ──────────────────────────────────────────────
                String[] defaultRoles = { "ADMIN", "MANAGER", "CASHIER", "SALES", "LOGISTICS", "USER" };
                for (String roleName : defaultRoles) {
                        roleRepository.findByName(roleName)
                                        .orElseGet(() -> {
                                                Role role = roleRepository.save(Role.builder().name(roleName).build());
                                                log.info("Created role: {}", roleName);
                                                return role;
                                        });
                }

                // ── 2. First-run notice ────────────────────────────────────────────────
                if (userRepository.count() == 0) {
                        log.info("==============================================");
                        log.info("  NO USERS FOUND — open the app and register.");
                        log.info("  The first user is automatically given ADMIN.");
                        log.info("==============================================");
                } else {
                        log.info("{} user(s) found in database", userRepository.count());
                }

                // ── 3. Seed sample products (if none exist) ────────────────────────────
                if (productRepository.count() == 0) {
                        productRepository.save(Product.builder().code("001").name("Tindi Coffee")
                                        .price(250.0).costPrice(180.0).stockQuantity(50).category("Drinks").build());
                        productRepository.save(Product.builder().code("002").name("Premium Tea")
                                        .price(150.0).costPrice(90.0).stockQuantity(80).category("Drinks").build());
                        productRepository.save(Product.builder().code("003").name("Glazed Donut")
                                        .price(100.0).costPrice(45.0).stockQuantity(30).category("Snacks").build());
                        productRepository.save(Product.builder().code("004").name("Beef Burger")
                                        .price(450.0).costPrice(280.0).stockQuantity(20).category("Food").build());
                        log.info("Seeded 4 sample products");
                }

                // Branches are added manually from the frontend — no demo data seeded.
        }
}
