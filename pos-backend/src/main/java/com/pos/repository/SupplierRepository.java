package com.pos.repository;

import com.pos.model.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SupplierRepository extends JpaRepository<Supplier, Long> {
    List<Supplier> findAllByOrderByNameAsc();
    List<Supplier> findByActiveTrue();

    @Query("SELECT s FROM Supplier s WHERE LOWER(s.name) LIKE LOWER(CONCAT('%',:q,'%')) OR s.phone LIKE CONCAT('%',:q,'%')")
    List<Supplier> search(@Param("q") String query);
}
