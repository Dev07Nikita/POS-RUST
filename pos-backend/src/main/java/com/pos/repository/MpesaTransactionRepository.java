package com.pos.repository;

import com.pos.model.MpesaTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface MpesaTransactionRepository extends JpaRepository<MpesaTransaction, Long> {

    Optional<MpesaTransaction> findByMerchantRequestId(String merchantRequestId);

    Optional<MpesaTransaction> findByCheckoutRequestId(String checkoutRequestId);

    Optional<MpesaTransaction> findByMpesaReceiptNumber(String mpesaReceiptNumber);

    List<MpesaTransaction> findByStatus(MpesaTransaction.TransactionStatus status);

    List<MpesaTransaction> findByStatusAndExpiresAtBefore(
            MpesaTransaction.TransactionStatus status,
            LocalDateTime expiryTime);

    List<MpesaTransaction> findBySaleId(Long saleId);
}
