package com.example.diary.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.fasterxml.jackson.annotation.JsonBackReference;

@Entity
@Table(name = "portfolios")
public class Portfolio {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String name;
    
    @Column(name = "portfolio_type", nullable = false)
    @Enumerated(EnumType.STRING)
    private PortfolioType type;
    
    @Column(length = 3, nullable = false)
    private String currency = "RUB"; // По умолчанию рубли
    
    private String description;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "is_active")
    private Boolean isActive;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonBackReference("user-portfolios")
    private User user;
    
    @OneToMany(mappedBy = "portfolio", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonManagedReference("portfolio-trades")
    private List<Trade> trades;
    
    @OneToMany(mappedBy = "portfolio", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonManagedReference("portfolio-spotTransactions")
    private List<SpotTransaction> spotTransactions;
    
    public enum PortfolioType {
        MARGIN("Маржинальный"),
        SPOT("Спотовый");
        
        private final String displayName;
        
        PortfolioType(String displayName) {
            this.displayName = displayName;
        }
        
        public String getDisplayName() {
            return displayName;
        }
    }
    
    public Portfolio() {
        this.createdAt = LocalDateTime.now();
        this.isActive = true;
    }
    
    public Portfolio(String name, PortfolioType type, User user) {
        this();
        this.name = name;
        this.type = type;
        this.user = user;
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public PortfolioType getType() {
        return type;
    }
    
    public void setType(PortfolioType type) {
        this.type = type;
    }
    
    public String getDescription() {
        return description;
    }
    
    public void setDescription(String description) {
        this.description = description;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public Boolean getIsActive() {
        return isActive;
    }
    
    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }
    
    public User getUser() {
        return user;
    }
    
    public void setUser(User user) {
        this.user = user;
    }
    
    public List<Trade> getTrades() {
        return trades;
    }
    
    public void setTrades(List<Trade> trades) {
        this.trades = trades;
    }
    
    public List<SpotTransaction> getSpotTransactions() {
        return spotTransactions;
    }
    
    public void setSpotTransactions(List<SpotTransaction> spotTransactions) {
        this.spotTransactions = spotTransactions;
    }
    
    public String getCurrency() {
        return currency;
    }
    
    public void setCurrency(String currency) {
        this.currency = currency;
    }
} 