package com.example.diary.repository;

import com.example.diary.model.SpotTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SpotTransactionRepository extends JpaRepository<SpotTransaction, Long> {
    
    List<SpotTransaction> findByTickerOrderByTradeDateDesc(String ticker);
    
    List<SpotTransaction> findByTransactionTypeOrderByTradeDateDesc(SpotTransaction.TransactionType transactionType);
    
    List<SpotTransaction> findByCompanyOrderByTradeDateDesc(String company);
} 