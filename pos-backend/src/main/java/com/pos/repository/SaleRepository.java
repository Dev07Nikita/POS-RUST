package com.pos.repository;

import com.pos.model.Sale;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.List;

@Repository
public interface SaleRepository extends JpaRepository<Sale, Long> {
    Optional<Sale> findByTransactionId(String transactionId);

    List<Sale> findByStatusOrderByTimestampDesc(String status);

    List<Sale> findByStatusAndTimestampAfterOrderByTimestampDesc(String status, LocalDateTime after);

    List<Sale> findTop20ByOrderByTimestampDesc();
}
