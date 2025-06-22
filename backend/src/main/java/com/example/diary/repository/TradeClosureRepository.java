package com.example.diary.repository;

import com.example.diary.model.TradeClosure;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TradeClosureRepository extends JpaRepository<TradeClosure, Long> {
    List<TradeClosure> findByTradeId(Long tradeId);
} 