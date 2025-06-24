package com.example.diary.repository;

import com.example.diary.model.Trade;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface TradeRepository extends JpaRepository<Trade, Long> {
    
    @Query("SELECT t FROM Trade t WHERE t.exitDate BETWEEN :startDate AND :endDate ORDER BY t.exitDate DESC")
    List<Trade> findByExitDateBetween(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    @Query("SELECT t.symbol, SUM((t.exitPrice - t.entryPrice) * t.quantity) as profit " +
           "FROM Trade t " +
           "WHERE t.exitDate BETWEEN :startDate AND :endDate " +
           "GROUP BY t.symbol " +
           "ORDER BY profit DESC")
    List<Object[]> findSymbolProfits(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    @Query("SELECT FUNCTION('DATE_FORMAT', t.exitDate, '%Y-%m') as month, " +
           "SUM((t.exitPrice - t.entryPrice) * t.quantity) as profit " +
           "FROM Trade t " +
           "WHERE t.exitDate BETWEEN :startDate AND :endDate " +
           "GROUP BY FUNCTION('DATE_FORMAT', t.exitDate, '%Y-%m') " +
           "ORDER BY month")
    List<Object[]> findMonthlyProfits(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);    
    // Методы для работы с портфелями
    @Query("SELECT t FROM Trade t LEFT JOIN t.portfolio p WHERE p.id = :portfolioId")
    List<Trade> findByPortfolioId(@Param("portfolioId") Long portfolioId);
}
