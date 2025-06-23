package com.example.diary.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonManagedReference;

@Entity
@Table(name = "trades")
public class Trade {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Symbol is required")
    @Size(min = 1, max = 10, message = "Symbol must be between 1 and 10 characters")
    @Column(nullable = false)
    private String symbol;

    @NotNull(message = "Entry price is required")
    @DecimalMin(value = "0.01", message = "Entry price must be greater than 0")
    @Column(name = "entry_price", nullable = false)
    private BigDecimal entryPrice;

    @DecimalMin(value = "0.01", message = "Exit price must be greater than 0")
    @Column(name = "exit_price", nullable = true)
    private BigDecimal exitPrice;

    @NotNull(message = "Quantity is required")
    @Min(value = 1, message = "Quantity must be at least 1")
    @Column(nullable = false)
    private Integer quantity;

    @NotNull(message = "Entry date is required")
    @Column(name = "entry_date", nullable = false)
    private LocalDate entryDate;

    @Column(name = "exit_date", nullable = true)
    private LocalDate exitDate;

    @NotNull(message = "Margin amount is required")
    @DecimalMin(value = "0.01", message = "Margin amount must be greater than 0")
    @Column(name = "margin_amount", nullable = false)
    private BigDecimal marginAmount;

    @Column(name = "daily_interest", columnDefinition = "TEXT")
    private String dailyInterest;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @OneToMany(mappedBy = "trade", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<TradeClosure> closures = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "portfolio_id")
    private Portfolio portfolio;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getSymbol() { return symbol; }
    public void setSymbol(String symbol) { this.symbol = symbol; }

    public BigDecimal getEntryPrice() { return entryPrice; }
    public void setEntryPrice(BigDecimal entryPrice) { this.entryPrice = entryPrice; }

    public BigDecimal getExitPrice() { return exitPrice; }
    public void setExitPrice(BigDecimal exitPrice) { this.exitPrice = exitPrice; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public LocalDate getEntryDate() { return entryDate; }
    public void setEntryDate(LocalDate entryDate) { this.entryDate = entryDate; }

    public LocalDate getExitDate() { return exitDate; }
    public void setExitDate(LocalDate exitDate) { this.exitDate = exitDate; }

    public BigDecimal getMarginAmount() { return marginAmount; }
    public void setMarginAmount(BigDecimal marginAmount) { this.marginAmount = marginAmount; }

    public String getDailyInterest() { return dailyInterest; }
    public void setDailyInterest(String dailyInterest) { this.dailyInterest = dailyInterest; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public List<TradeClosure> getClosures() { return closures; }
    public void setClosures(List<TradeClosure> closures) { this.closures = closures; }

    public Portfolio getPortfolio() { return portfolio; }
    public void setPortfolio(Portfolio portfolio) { this.portfolio = portfolio; }

    @Transient
    public Double getTotalCost() {
        if (entryPrice == null || quantity == null) return null;
        // Округляем до 2 знаков после запятой
        double result = entryPrice.doubleValue() * quantity;
        return Math.round(result * 100.0) / 100.0;
    }

    @Transient
    public Double getMarginRequired() {
        // Не используется в новой модели, оставляем для совместимости
        return null;
    }

    @Transient
    public Double getDailyInterestAmount() {
        if (getTotalCost() == null || marginAmount == null) return null;
        // Процентная ставка из marginAmount (годовая ставка в процентах)
        double yearlyInterest = getTotalCost() * marginAmount.doubleValue() / 100.0;
        double dailyInterest = yearlyInterest / 365.0;
        // Округляем до 2 знаков после запятой
        return Math.round(dailyInterest * 100.0) / 100.0;
    }

    @Transient
    public Double getTotalInterest() {
        if (getDailyInterestAmount() == null || entryDate == null || exitDate == null) return null;
        long days = ChronoUnit.DAYS.between(entryDate, exitDate);
        double interest = getDailyInterestAmount() * days;
        // Округляем до 2 знаков после запятой
        return Math.round(interest * 100.0) / 100.0;
    }

    @Transient
    public Double getProfit() {
        if (exitPrice == null || quantity == null || getTotalInterest() == null) return null;
        double priceProfit = (exitPrice.doubleValue() - entryPrice.doubleValue()) * quantity;
        return priceProfit - getTotalInterest();
    }

    @Transient
    public List<DailyInterest> getDailyInterestList() {
        List<DailyInterest> result = new ArrayList<>();
        if (entryDate == null || exitDate == null || getDailyInterestAmount() == null) return result;

        LocalDate currentDate = entryDate;
        while (!currentDate.isAfter(exitDate)) {
            DailyInterest daily = new DailyInterest();
            daily.setDate(currentDate);
            daily.setAmount(getDailyInterestAmount());
            result.add(daily);
            currentDate = currentDate.plusDays(1);
        }
        return result;
    }

    @Transient
    public Integer getOpenQuantity() {
        if (quantity == null) return null;
        int closed = closures.stream().mapToInt(c -> c.getClosedQuantity()).sum();
        return quantity - closed;
    }

    public static class DailyInterest {
        private LocalDate date;
        private Double amount;

        public LocalDate getDate() { return date; }
        public void setDate(LocalDate date) { this.date = date; }
        public Double getAmount() { return amount; }
        public void setAmount(Double amount) { this.amount = amount; }
    }
}
