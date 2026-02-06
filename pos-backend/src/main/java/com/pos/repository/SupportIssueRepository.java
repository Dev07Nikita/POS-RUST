package com.pos.repository;

import com.pos.model.SupportIssue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SupportIssueRepository extends JpaRepository<SupportIssue, Long> {
}
