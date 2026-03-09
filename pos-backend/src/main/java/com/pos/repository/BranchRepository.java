package com.pos.repository;

import com.pos.model.Branch;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BranchRepository extends JpaRepository<Branch, Long> {

    /** All active branches */
    List<Branch> findByActiveTrue();

    /** All branches sorted by name A–Z (valid Spring Data derived-query) */
    List<Branch> findAllByOrderByNameAsc();
}
