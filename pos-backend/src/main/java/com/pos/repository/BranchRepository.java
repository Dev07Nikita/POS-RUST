package com.pos.repository;

import com.pos.model.Branch;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BranchRepository extends JpaRepository<Branch, Long> {
    List<Branch> findByActiveTrue();

    List<Branch> findByOrderByNameAsc();
}
