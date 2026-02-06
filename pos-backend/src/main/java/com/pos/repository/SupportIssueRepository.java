package com.pos.repository;

import com.pos.model.SupportIssue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SupportIssueRepository extends JpaRepository<SupportIssue, Long> {
    @Query("SELECT s FROM SupportIssue s WHERE s.department = :dept OR s.targetDepartment = :dept OR s.targetDepartment = 'ALL' ORDER BY s.timestamp ASC")
    List<SupportIssue> findMessagesForDepartment(@Param("dept") String dept);
}
