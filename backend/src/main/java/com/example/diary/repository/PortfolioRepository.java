package com.example.diary.repository;

import com.example.diary.model.Portfolio;
import com.example.diary.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface PortfolioRepository extends JpaRepository<Portfolio, Long> {
    
    List<Portfolio> findByUserAndIsActiveTrue(User user);
    
    List<Portfolio> findByUser(User user);
    
    Optional<Portfolio> findByIdAndUser(Long id, User user);
    
    List<Portfolio> findByUserAndType(User user, Portfolio.PortfolioType type);
} 
 
 
 