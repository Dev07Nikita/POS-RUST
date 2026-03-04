package com.pos.config;

import com.pos.model.Branch;
import com.pos.model.Product;
import com.pos.model.Role;
import com.pos.repository.BranchRepository;
import com.pos.repository.ProductRepository;
import com.pos.repository.RoleRepository;
import com.pos.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Seeds default roles, products, and branches on startup.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {
    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final BranchRepository branchRepository;

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

        // Log if no users exist - first user to register becomes admin
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

        // Seed sample products if none exist
        if (productRepository.count() == 0) {
            productRepository.save(Product.builder().code("001").name("Tindi Coffee").price(250.0).costPrice(180.0)
                    .stockQuantity(50).category("Drinks").build());
            productRepository.save(Product.builder().code("002").name("Premium Tea").price(150.0).costPrice(90.0)
                    .stockQuantity(80).category("Drinks").build());
            productRepository.save(Product.builder().code("003").name("Glazed Donut").price(100.0).costPrice(45.0)
                    .stockQuantity(30).category("Snacks").build());
            productRepository.save(Product.builder().code("004").name("Beef Burger").price(450.0).costPrice(280.0)
                    .stockQuantity(20).category("Food").build());
            log.info("Seeded 4 sample products with cost data");
        }

        // Seed demo branches if none exist
        if (branchRepository.count() == 0) {
            branchRepository.save(Branch.builder().name("Headquarters - Nairobi CBD").code("HQ-001")
                    .location("Kenyatta Avenue, Nairobi CBD").city("Nairobi").managerName("Jane Kamau")
                    .managerPhone("0712000001").email("hq@safipos.co.ke").staffCount(12).active(true).build());
            branchRepository.save(Branch.builder().name("Westlands Branch").code("WL-002")
                    .location("Westlands Shopping Centre").city("Nairobi").managerName("Brian Ochieng")
                    .managerPhone("0712000002").email("westlands@safipos.co.ke").staffCount(8).active(true).build());
            branchRepository.save(Branch.builder().name("Mombasa Road Branch").code("MB-003")
                    .location("Nextgen Mall, Mombasa Rd").city("Nairobi").managerName("Fatuma Ali")
                    .managerPhone("0712000003").email("mombasa.rd@safipos.co.ke").staffCount(6).active(true).build());
            branchRepository.save(Branch.builder().name("Kisumu Branch").code("KS-004")
                    .location("Mega Plaza, Oginga Odinga St").city("Kisumu").managerName("Peter Otieno")
                    .managerPhone("0712000004").email("kisumu@safipos.co.ke").staffCount(5).active(true).build());
            branchRepository.save(Branch.builder().name("Mombasa City Branch").code("MSA-005")
                    .location("City Mall, Nyali").city("Mombasa").managerName("Aisha Hassan").managerPhone("0712000005")
                    .email("mombasa@safipos.co.ke").staffCount(7).active(false).build());
            log.info("Seeded 5 demo branches");
        }
    }
}
