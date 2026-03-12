package com.pos.repository;

import com.pos.model.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {
    List<Expense> findAllByOrderByDateDesc();
    List<Expense> findByDateAfterOrderByDateDesc(LocalDateTime after);
    List<Expense> findByCategoryOrderByDateDesc(String category);

    @Query("SELECT SUM(e.amount) FROM Expense e WHERE e.date >= :from")
    Double sumAmountSince(LocalDateTime from);
}
