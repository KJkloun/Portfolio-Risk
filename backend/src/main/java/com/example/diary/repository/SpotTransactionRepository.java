package com.example.diary.repository;

import com.example.diary.model.SpotTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SpotTransactionRepository extends JpaRepository<SpotTransaction, Long> {
    
    List<SpotTransaction> findByTickerOrderByTradeDateDesc(String ticker);
    
    List<SpotTransaction> findByTransactionTypeOrderByTradeDateDesc(SpotTransaction.TransactionType transactionType);
    
    List<SpotTransaction> findByCompanyOrderByTradeDateDesc(String company);
    
    List<SpotTransaction> findByPortfolioId(Long portfolioId);
    
    List<SpotTransaction> findByPortfolioIdAndTickerOrderByTradeDateDesc(Long portfolioId, String ticker);
    
    List<SpotTransaction> findByPortfolioIdAndTransactionTypeOrderByTradeDateDesc(Long portfolioId, SpotTransaction.TransactionType transactionType);
    
    @Modifying
    @Query("UPDATE SpotTransaction st SET st.amount = -ABS(st.amount) WHERE st.transactionType = 'WITHDRAW' AND st.amount > 0")
    int fixWithdrawAmounts();
    
    @Modifying
    @Query("UPDATE SpotTransaction st SET st.amount = -ABS(st.amount) WHERE st.transactionType = 'BUY' AND st.amount > 0")
    int fixBuyAmounts();
}
