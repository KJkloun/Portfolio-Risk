package com.example.diary.service;

import com.example.diary.model.Portfolio;
import com.example.diary.model.User;
import com.example.diary.repository.PortfolioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class PortfolioService {
    
    @Autowired
    private PortfolioRepository portfolioRepository;
    
    public Portfolio createPortfolio(String name, Portfolio.PortfolioType type, String currency, String description, User user) {
        Portfolio portfolio = new Portfolio();
        portfolio.setName(name);
        portfolio.setType(type);
        portfolio.setCurrency(currency);
        portfolio.setDescription(description);
        portfolio.setUser(user);
        
        return portfolioRepository.save(portfolio);
    }
    
    public List<Portfolio> getUserPortfolios(User user) {
        return portfolioRepository.findByUserAndIsActiveTrue(user);
    }
    
    public List<Portfolio> getUserPortfoliosByType(User user, Portfolio.PortfolioType type) {
        return portfolioRepository.findByUserAndType(user, type);
    }
    
    public Optional<Portfolio> getPortfolioById(Long id, User user) {
        return portfolioRepository.findByIdAndUser(id, user);
    }
    
    public Portfolio updatePortfolio(Long id, String name, String currency, String description, User user) {
        Optional<Portfolio> portfolioOpt = portfolioRepository.findByIdAndUser(id, user);
        if (portfolioOpt.isPresent()) {
            Portfolio portfolio = portfolioOpt.get();
            portfolio.setName(name);
            portfolio.setCurrency(currency);
            portfolio.setDescription(description);
            return portfolioRepository.save(portfolio);
        }
        throw new RuntimeException("Портфель не найден");
    }
    
    public void deactivatePortfolio(Long id, User user) {
        Optional<Portfolio> portfolioOpt = portfolioRepository.findByIdAndUser(id, user);
        if (portfolioOpt.isPresent()) {
            Portfolio portfolio = portfolioOpt.get();
            portfolio.setIsActive(false);
            portfolioRepository.save(portfolio);
        } else {
            throw new RuntimeException("Портфель не найден");
        }
    }
} 
 
 
 