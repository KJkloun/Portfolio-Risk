package com.example.diary.repository;

import com.example.diary.model.Portfolio;
import com.example.diary.model.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PortfolioRepository extends JpaRepository<Portfolio, Long> {
    List<Portfolio> findByUser(AppUser user);
} 