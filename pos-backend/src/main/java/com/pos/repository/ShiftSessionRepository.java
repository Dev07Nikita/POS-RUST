package com.pos.repository;

import com.pos.model.ShiftSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ShiftSessionRepository extends JpaRepository<ShiftSession, Long> {
    List<ShiftSession> findAllByOrderByOpenedAtDesc();
    Optional<ShiftSession> findFirstByCashierUsernameAndStatusOrderByOpenedAtDesc(String cashier, String status);
    List<ShiftSession> findByCashierUsernameOrderByOpenedAtDesc(String cashier);
    List<ShiftSession> findByStatusOrderByOpenedAtDesc(String status);
}
