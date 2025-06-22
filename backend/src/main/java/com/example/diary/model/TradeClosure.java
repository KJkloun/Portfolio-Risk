package com.example.diary.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import com.fasterxml.jackson.annotation.JsonBackReference;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "trade_closures")
public class TradeClosure {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trade_id", nullable = false)
    @JsonBackReference
    private Trade trade;

    @NotNull(message = "Закрываемое количество обязательно")
    @Min(value = 1, message = "Количество должно быть >= 1")
    @Column(name = "closed_quantity", nullable = false)
    private Integer closedQuantity;

    @NotNull(message = "Цена выхода обязательна")
    @DecimalMin(value = "0.01", message = "Цена должна быть > 0")
    @Column(name = "exit_price", nullable = false)
    private BigDecimal exitPrice;

    @NotNull(message = "Дата выхода обязательна")
    @Column(name = "exit_date", nullable = false)
    private LocalDate exitDate;

    @Column(columnDefinition = "TEXT")
    private String notes;

    // Getters & Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Trade getTrade() { return trade; }
    public void setTrade(Trade trade) { this.trade = trade; }

    public Integer getClosedQuantity() { return closedQuantity; }
    public void setClosedQuantity(Integer closedQuantity) { this.closedQuantity = closedQuantity; }

    public BigDecimal getExitPrice() { return exitPrice; }
    public void setExitPrice(BigDecimal exitPrice) { this.exitPrice = exitPrice; }

    public LocalDate getExitDate() { return exitDate; }
    public void setExitDate(LocalDate exitDate) { this.exitDate = exitDate; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    @Transient
    public Double getAmount() {
        if (exitPrice == null || closedQuantity == null) return null;
        double result = exitPrice.doubleValue() * closedQuantity;
        return Math.round(result * 100.0) / 100.0;
    }
} 