package com.pos.repository;

import com.pos.model.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CustomerRepository extends JpaRepository<Customer, Long> {

    Optional<Customer> findByPhone(String phone);

    /** Search by name OR phone (case-insensitive) */
    @Query("SELECT c FROM Customer c WHERE " +
            "LOWER(c.name) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
            "c.phone LIKE CONCAT('%', :q, '%')")
    List<Customer> search(@Param("q") String query);

    /** Top customers by spend */
    List<Customer> findAllByOrderByTotalSpentDesc();
}
