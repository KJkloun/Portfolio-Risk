package com.example.diary.model;

import jakarta.persistence.*;

@Entity
@Table(name = "portfolios")
public class Portfolio {

    public enum PortfolioType {
        SPOT,
        MARGIN
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PortfolioType type;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private AppUser user;

    // Дальнейшие связи с транзакциями/сделками будут добавлены позже

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public PortfolioType getType() { return type; }
    public void setType(PortfolioType type) { this.type = type; }

    public AppUser getUser() { return user; }
    public void setUser(AppUser user) { this.user = user; }
} 