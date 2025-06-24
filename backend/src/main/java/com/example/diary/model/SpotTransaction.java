package com.example.diary.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonProperty;

@Entity
@Table(name = "spot_transactions")
public class SpotTransaction {
    
    public enum TransactionType { 
        DEPOSIT("Поступление"), 
        WITHDRAW("Снятие"), 
        BUY("Покупка"), 
        SELL("Продажа"), 
        DIVIDEND("Дивиденды");
        
        private final String displayName;
        
        TransactionType(String displayName) {
            this.displayName = displayName;
        }
        
        public String getDisplayName() {
            return displayName;
        }
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "company")
    private String company;

    @Column(name = "ticker")
    private String ticker;

    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type")
    private TransactionType transactionType;

    @Column(name = "price", precision = 19, scale = 6)
    private BigDecimal price;

    @Column(name = "quantity", precision = 19, scale = 6)
    private BigDecimal quantity;

    @Column(name = "amount", precision = 19, scale = 6)
    private BigDecimal amount; // Стоимость (price * quantity, может быть отрицательной для покупок)

    @Column(name = "trade_date")
    @JsonProperty("transactionDate")
    private LocalDate tradeDate;

    @Column(name = "note")
    private String note;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "portfolio_id", nullable = false)
    @JsonBackReference("portfolio-spotTransactions")
    private Portfolio portfolio;

    // Конструкторы
    public SpotTransaction() {}

    public SpotTransaction(String company, String ticker, TransactionType transactionType, 
                          BigDecimal price, BigDecimal quantity, LocalDate tradeDate, String note) {
        this.company = company;
        this.ticker = ticker;
        this.transactionType = transactionType;
        this.price = price;
        this.quantity = quantity;
        this.tradeDate = tradeDate;
        this.note = note;
        calculateAmount();
    }

    @PrePersist
    @PreUpdate
    private void calculateAmount() {
        if (price != null && quantity != null) {
            BigDecimal calculatedAmount = price.multiply(quantity);
            
            // Для покупок делаем сумму отрицательной (как в таблице)
            if (transactionType == TransactionType.BUY) {
                calculatedAmount = calculatedAmount.negate();
            }
            
            this.amount = calculatedAmount;
        }
    }

    // Геттеры и сеттеры
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCompany() { return company; }
    public void setCompany(String company) { this.company = company; }

    public String getTicker() { return ticker; }
    public void setTicker(String ticker) { this.ticker = ticker; }

    public TransactionType getTransactionType() { return transactionType; }
    public void setTransactionType(TransactionType transactionType) { this.transactionType = transactionType; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public BigDecimal getQuantity() { return quantity; }
    public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public LocalDate getTradeDate() { return tradeDate; }
    public void setTradeDate(LocalDate tradeDate) { this.tradeDate = tradeDate; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public Portfolio getPortfolio() { return portfolio; }
    public void setPortfolio(Portfolio portfolio) { this.portfolio = portfolio; }
} 