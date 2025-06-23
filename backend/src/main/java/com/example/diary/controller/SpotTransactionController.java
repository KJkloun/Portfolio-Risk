package com.example.diary.controller;

import com.example.diary.model.SpotTransaction;
import com.example.diary.repository.SpotTransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/spot-transactions")
@CrossOrigin(origins = "*")
public class SpotTransactionController {

    @Autowired
    private SpotTransactionRepository repository;

    // Получить все транзакции
    @GetMapping
    public List<SpotTransaction> getAllTransactions() {
        return repository.findAll();
    }

    // Создать новую транзакцию
    @PostMapping
    public SpotTransaction createTransaction(@RequestBody SpotTransaction transaction) {
        return repository.save(transaction);
    }

    // Получить транзакцию по ID
    @GetMapping("/{id}")
    public ResponseEntity<SpotTransaction> getTransaction(@PathVariable Long id) {
        return repository.findById(id)
                .map(transaction -> ResponseEntity.ok().body(transaction))
                .orElse(ResponseEntity.notFound().build());
    }

    // Обновить транзакцию
    @PutMapping("/{id}")
    public ResponseEntity<SpotTransaction> updateTransaction(@PathVariable Long id, @RequestBody SpotTransaction transactionDetails) {
        return repository.findById(id)
                .map(transaction -> {
                    transaction.setCompany(transactionDetails.getCompany());
                    transaction.setTicker(transactionDetails.getTicker());
                    transaction.setTransactionType(transactionDetails.getTransactionType());
                    transaction.setPrice(transactionDetails.getPrice());
                    transaction.setQuantity(transactionDetails.getQuantity());
                    transaction.setTradeDate(transactionDetails.getTradeDate());
                    transaction.setNote(transactionDetails.getNote());
                    return ResponseEntity.ok(repository.save(transaction));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Удалить транзакцию
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTransaction(@PathVariable Long id) {
        return repository.findById(id)
                .map(transaction -> {
                    repository.delete(transaction);
                    return ResponseEntity.ok().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Получить портфель (текущие позиции)
    @GetMapping("/portfolio")
    public Map<String, Object> getPortfolio() {
        List<SpotTransaction> transactions = repository.findAll();
        
        // Группируем по тикерам
        Map<String, List<SpotTransaction>> byTicker = transactions.stream()
                .collect(Collectors.groupingBy(SpotTransaction::getTicker));
        
        List<Map<String, Object>> positions = new ArrayList<>();
        BigDecimal totalCash = BigDecimal.ZERO;
        
        for (Map.Entry<String, List<SpotTransaction>> entry : byTicker.entrySet()) {
            String ticker = entry.getKey();
            List<SpotTransaction> tickerTransactions = entry.getValue();
            
            if ("USD".equals(ticker)) {
                // Считаем наличные
                totalCash = tickerTransactions.stream()
                        .map(SpotTransaction::getAmount)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
            } else {
                // Считаем позицию по акциям
                BigDecimal totalQuantity = BigDecimal.ZERO;
                BigDecimal totalCost = BigDecimal.ZERO;
                String company = "";
                
                for (SpotTransaction tx : tickerTransactions) {
                    if (tx.getTransactionType() == SpotTransaction.TransactionType.BUY) {
                        totalQuantity = totalQuantity.add(tx.getQuantity());
                        totalCost = totalCost.add(tx.getAmount().abs()); // amount для покупок отрицательный
                        company = tx.getCompany();
                    } else if (tx.getTransactionType() == SpotTransaction.TransactionType.SELL) {
                        totalQuantity = totalQuantity.subtract(tx.getQuantity());
                        totalCost = totalCost.subtract(tx.getAmount().abs());
                    }
                }
                
                if (totalQuantity.compareTo(BigDecimal.ZERO) != 0) {
                    Map<String, Object> position = new HashMap<>();
                    position.put("ticker", ticker);
                    position.put("company", company);
                    position.put("quantity", totalQuantity);
                    position.put("averagePrice", totalCost.divide(totalQuantity, 2, BigDecimal.ROUND_HALF_UP));
                    position.put("totalCost", totalCost);
                    positions.add(position);
                }
            }
        }
        
        Map<String, Object> result = new HashMap<>();
        result.put("positions", positions);
        result.put("cash", totalCash);
        
        return result;
    }

    // Получить статистику
    @GetMapping("/statistics")
    public Map<String, Object> getStatistics() {
        List<SpotTransaction> transactions = repository.findAll();
        
        // Общая статистика
        long totalTransactions = transactions.size();
        BigDecimal totalInvested = transactions.stream()
                .filter(tx -> tx.getTransactionType() == SpotTransaction.TransactionType.BUY)
                .map(tx -> tx.getAmount().abs())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        BigDecimal totalReceived = transactions.stream()
                .filter(tx -> tx.getTransactionType() == SpotTransaction.TransactionType.SELL)
                .map(SpotTransaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        BigDecimal totalDividends = transactions.stream()
                .filter(tx -> tx.getTransactionType() == SpotTransaction.TransactionType.DIVIDEND)
                .map(SpotTransaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        // Статистика по тикерам
        Map<String, List<SpotTransaction>> byTicker = transactions.stream()
                .filter(tx -> !"USD".equals(tx.getTicker()))
                .collect(Collectors.groupingBy(SpotTransaction::getTicker));
        
        List<Map<String, Object>> tickerStats = new ArrayList<>();
        for (Map.Entry<String, List<SpotTransaction>> entry : byTicker.entrySet()) {
            String ticker = entry.getKey();
            List<SpotTransaction> tickerTransactions = entry.getValue();
            
            BigDecimal bought = tickerTransactions.stream()
                    .filter(tx -> tx.getTransactionType() == SpotTransaction.TransactionType.BUY)
                    .map(tx -> tx.getAmount().abs())
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            
            BigDecimal sold = tickerTransactions.stream()
                    .filter(tx -> tx.getTransactionType() == SpotTransaction.TransactionType.SELL)
                    .map(SpotTransaction::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            
            BigDecimal dividends = tickerTransactions.stream()
                    .filter(tx -> tx.getTransactionType() == SpotTransaction.TransactionType.DIVIDEND)
                    .map(SpotTransaction::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            
            Map<String, Object> stat = new HashMap<>();
            stat.put("ticker", ticker);
            stat.put("company", tickerTransactions.get(0).getCompany());
            stat.put("totalBought", bought);
            stat.put("totalSold", sold);
            stat.put("totalDividends", dividends);
            stat.put("netResult", sold.subtract(bought).add(dividends));
            
            tickerStats.add(stat);
        }
        
        Map<String, Object> result = new HashMap<>();
        result.put("totalTransactions", totalTransactions);
        result.put("totalInvested", totalInvested);
        result.put("totalReceived", totalReceived);
        result.put("totalDividends", totalDividends);
        result.put("netProfit", totalReceived.subtract(totalInvested).add(totalDividends));
        result.put("tickerStatistics", tickerStats);
        
        return result;
    }

    // Получить транзакции по тикеру
    @GetMapping("/by-ticker/{ticker}")
    public List<SpotTransaction> getTransactionsByTicker(@PathVariable String ticker) {
        return repository.findByTickerOrderByTradeDateDesc(ticker);
    }

    // Получить транзакции по типу
    @GetMapping("/by-type/{type}")
    public List<SpotTransaction> getTransactionsByType(@PathVariable SpotTransaction.TransactionType type) {
        return repository.findByTransactionTypeOrderByTradeDateDesc(type);
    }
} 