package com.example.diary.controller;

import com.example.diary.model.AppUser;
import com.example.diary.model.Portfolio;
import com.example.diary.repository.AppUserRepository;
import com.example.diary.repository.PortfolioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/portfolios")
@CrossOrigin(origins = "*")
public class PortfolioController {

    @Autowired
    private PortfolioRepository portfolioRepository;

    @Autowired
    private AppUserRepository userRepository;

    // Получить список портфелей пользователя
    @GetMapping
    public ResponseEntity<?> list(@RequestParam Long userId) {
        Optional<AppUser> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("message", "User not found"));
        List<Portfolio> portfolios = portfolioRepository.findByUser(userOpt.get());
        return ResponseEntity.ok(portfolios);
    }

    // Создать портфель
    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        Long userId = ((Number) body.get("userId")).longValue();
        String name = (String) body.get("name");
        String typeStr = (String) body.get("type");
        if (userId == null || name == null || typeStr == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "userId, name and type required"));
        }
        Optional<AppUser> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("message", "User not found"));

        Portfolio portfolio = new Portfolio();
        portfolio.setName(name);
        portfolio.setType(Portfolio.PortfolioType.valueOf(typeStr.toUpperCase()));
        portfolio.setUser(userOpt.get());

        Portfolio saved = portfolioRepository.save(portfolio);
        return ResponseEntity.ok(saved);
    }

    // Переименовать / изменить портфель
    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Optional<Portfolio> portOpt = portfolioRepository.findById(id);
        if (portOpt.isEmpty()) return ResponseEntity.notFound().build();
        Portfolio p = portOpt.get();
        if (body.containsKey("name")) p.setName((String) body.get("name"));
        if (body.containsKey("type")) p.setType(Portfolio.PortfolioType.valueOf(((String) body.get("type")).toUpperCase()));
        return ResponseEntity.ok(portfolioRepository.save(p));
    }

    // Удалить портфель
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        Optional<Portfolio> portOpt = portfolioRepository.findById(id);
        if (portOpt.isEmpty()) return ResponseEntity.notFound().build();
        portfolioRepository.delete(portOpt.get());
        return ResponseEntity.ok().build();
    }
} 