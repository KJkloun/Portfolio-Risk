package com.example.diary.controller;

import com.example.diary.model.Trade;
import com.example.diary.repository.TradeRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;
import java.math.BigDecimal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/trades")
@CrossOrigin(origins = "*")
public class TradeController {

    private static final Logger logger = LoggerFactory.getLogger(TradeController.class);

    @Autowired
    private TradeRepository tradeRepository;

    @GetMapping
    public ResponseEntity<List<Trade>> getAllTrades() {
        List<Trade> trades = tradeRepository.findAll();
        return ResponseEntity.ok(trades);
    }

    @PostMapping("/buy")
    public ResponseEntity<?> buyTrade(@RequestBody Trade trade) {
        try {
            logger.info("Получен запрос на покупку: {}", trade);
            
            // Используем дату из запроса, если она не указана - используем текущую
            if (trade.getEntryDate() == null) {
                trade.setEntryDate(LocalDate.now());
            }
            
            // Проверка, что необходимые поля не null
            if (trade.getSymbol() == null || trade.getSymbol().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Тикер не может быть пустым"));
            }
            
            if (trade.getEntryPrice() == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "Цена входа не может быть пустой"));
            }
            
            if (trade.getQuantity() == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "Количество не может быть пустым"));
            }
            
            if (trade.getMarginAmount() == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "Процент за кредит не может быть пустым"));
            }
            
            // Преобразуем числовые значения в BigDecimal, если они пришли как Double
            if (!(trade.getEntryPrice() instanceof BigDecimal)) {
                trade.setEntryPrice(BigDecimal.valueOf(trade.getEntryPrice().doubleValue()));
    }

            if (!(trade.getMarginAmount() instanceof BigDecimal)) {
                trade.setMarginAmount(BigDecimal.valueOf(trade.getMarginAmount().doubleValue()));
            }
            
            // Рассчитываем проценты по кредиту
            Double totalCost = trade.getTotalCost();
            Double dailyInterestAmount = trade.getDailyInterestAmount();
            
            logger.info("Расчет: totalCost={}, dailyInterest={}", 
                        totalCost, dailyInterestAmount);
            
            // Сохраняем сделку
            Trade savedTrade = tradeRepository.save(trade);
            logger.info("Сделка сохранена с ID: {}", savedTrade.getId());
            
            URI location = ServletUriComponentsBuilder
                .fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(savedTrade.getId())
                .toUri();

            Map<String, Object> response = new HashMap<>();
            response.put("trade", savedTrade);
            response.put("totalCost", totalCost);
            response.put("dailyInterest", dailyInterestAmount);

            return ResponseEntity.created(location).body(response);
        } catch (Exception e) {
            logger.error("Ошибка при создании сделки", e);
            Map<String, String> error = new HashMap<>();
            error.put("message", "Ошибка создания сделки: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PostMapping("/bulk-import")
    public ResponseEntity<?> bulkImportTrades(@RequestBody Map<String, List<Map<String, Object>>> request) {
        try {
            logger.info("Получен запрос на массовый импорт сделок");

            List<Map<String, Object>> tradesToImport = request.get("trades");
            if (tradesToImport == null || tradesToImport.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Список сделок пуст"));
            }

            List<Trade> savedTrades = new ArrayList<>();
            int importedCount = 0;
            int errorCount = 0;
            List<Map<String, String>> errors = new ArrayList<>();

            for (int i = 0; i < tradesToImport.size(); i++) {
                try {
                    Map<String, Object> tradeData = tradesToImport.get(i);
                    Trade trade = new Trade();

                    // Обязательные поля
                    String symbol = (String) tradeData.get("symbol");
                    if (symbol == null || symbol.trim().isEmpty()) {
                        throw new IllegalArgumentException("Тикер не может быть пустым");
                    }
                    trade.setSymbol(symbol.trim().toUpperCase());

                    // Цена входа
                    Object entryPriceObj = tradeData.get("entryPrice");
                    if (entryPriceObj == null) {
                        throw new IllegalArgumentException("Цена входа не может быть пустой");
                    }
                    BigDecimal entryPrice;
                    if (entryPriceObj instanceof String) {
                        entryPrice = new BigDecimal((String) entryPriceObj);
                    } else if (entryPriceObj instanceof Number) {
                        entryPrice = BigDecimal.valueOf(((Number) entryPriceObj).doubleValue());
                    } else {
                        throw new IllegalArgumentException("Неверный формат цены входа");
                    }
                    trade.setEntryPrice(entryPrice);

                    // Количество
                    Object quantityObj = tradeData.get("quantity");
                    if (quantityObj == null) {
                        throw new IllegalArgumentException("Количество не может быть пустым");
                    }
                    Integer quantity;
                    if (quantityObj instanceof String) {
                        quantity = Integer.parseInt((String) quantityObj);
                    } else if (quantityObj instanceof Number) {
                        quantity = ((Number) quantityObj).intValue();
                    } else {
                        throw new IllegalArgumentException("Неверный формат количества");
                    }
                    trade.setQuantity(quantity);

                    // Процент маржи
                    Object marginAmountObj = tradeData.get("marginAmount");
                    if (marginAmountObj == null) {
                        throw new IllegalArgumentException("Процент маржи не может быть пустым");
                    }
                    BigDecimal marginAmount;
                    if (marginAmountObj instanceof String) {
                        marginAmount = new BigDecimal((String) marginAmountObj);
                    } else if (marginAmountObj instanceof Number) {
                        marginAmount = BigDecimal.valueOf(((Number) marginAmountObj).doubleValue());
                    } else {
                        throw new IllegalArgumentException("Неверный формат процента маржи");
                    }
                    trade.setMarginAmount(marginAmount);

                    // Дата входа
                    Object entryDateObj = tradeData.get("entryDate");
                    if (entryDateObj == null) {
                        throw new IllegalArgumentException("Дата входа не может быть пустой");
                    }
                    LocalDate entryDate;
                    if (entryDateObj instanceof String) {
                        entryDate = LocalDate.parse((String) entryDateObj);
                    } else {
                        throw new IllegalArgumentException("Неверный формат даты входа");
                    }
                    trade.setEntryDate(entryDate);

                    // Опциональные поля
                    // Заметки
                    if (tradeData.containsKey("notes")) {
                        trade.setNotes((String) tradeData.get("notes"));
                    }

                    // Дата выхода (если есть)
                    if (tradeData.containsKey("exitDate") && tradeData.get("exitDate") != null && !((String) tradeData.get("exitDate")).isEmpty()) {
                        LocalDate exitDate = LocalDate.parse((String) tradeData.get("exitDate"));
                        trade.setExitDate(exitDate);

                        // Если есть дата выхода, должна быть и цена выхода
                        if (tradeData.containsKey("exitPrice") && tradeData.get("exitPrice") != null) {
                            Object exitPriceObj = tradeData.get("exitPrice");
                            BigDecimal exitPrice;
                            if (exitPriceObj instanceof String) {
                                if (!((String) exitPriceObj).isEmpty()) {
                                    exitPrice = new BigDecimal((String) exitPriceObj);
                                    trade.setExitPrice(exitPrice);
                                }
                            } else if (exitPriceObj instanceof Number) {
                                exitPrice = BigDecimal.valueOf(((Number) exitPriceObj).doubleValue());
                                trade.setExitPrice(exitPrice);
                            }
                        }
                    }

                    // Сохраняем сделку
                    Trade savedTrade = tradeRepository.save(trade);
                    savedTrades.add(savedTrade);
                    importedCount++;
                    logger.info("Импортирована сделка с ID: {}", savedTrade.getId());
                } catch (Exception e) {
                    errorCount++;
                    Map<String, String> error = new HashMap<>();
                    error.put("row", String.valueOf(i + 1));
                    error.put("message", e.getMessage());
                    errors.add(error);
                    logger.error("Ошибка при импорте строки {}: {}", i + 1, e.getMessage());
                }
            }

            Map<String, Object> response = new HashMap<>();
            response.put("importedCount", importedCount);
            response.put("errorCount", errorCount);
            if (!errors.isEmpty()) {
                response.put("errors", errors);
            }

            if (importedCount > 0) {
                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.badRequest().body(response);
            }
        } catch (Exception e) {
            logger.error("Ошибка при массовом импорте сделок", e);
            Map<String, String> error = new HashMap<>();
            error.put("message", "Ошибка массового импорта сделок: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PostMapping("/{id}/sell")
    public ResponseEntity<?> sellTrade(
            @PathVariable Long id,
            @RequestParam Double exitPrice) {
        try {
            Trade trade = tradeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Сделка не найдена"));

            trade.setExitPrice(BigDecimal.valueOf(exitPrice));
            trade.setExitDate(LocalDate.now());
            
            Trade updatedTrade = tradeRepository.save(trade);

            Map<String, Object> response = new HashMap<>();
            response.put("trade", updatedTrade);
            response.put("totalInterest", updatedTrade.getTotalInterest());
            response.put("profit", updatedTrade.getProfit());
            response.put("dailyInterests", updatedTrade.getDailyInterestList());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Ошибка при продаже сделки", e);
            Map<String, String> error = new HashMap<>();
            error.put("message", "Ошибка продажи сделки: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @GetMapping("/{id}/daily-interest")
    public ResponseEntity<?> getDailyInterest(@PathVariable Long id) {
        try {
            Trade trade = tradeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Сделка не найдена"));

            Map<String, Object> response = new HashMap<>();
            response.put("dailyInterest", trade.getDailyInterestAmount());
            response.put("totalInterest", trade.getTotalInterest());
            response.put("interests", trade.getDailyInterestList());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Ошибка при получении процентов", e);
            Map<String, String> error = new HashMap<>();
            error.put("message", "Ошибка получения ежедневных процентов: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getTrade(@PathVariable Long id) {
        return tradeRepository.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTrade(@PathVariable Long id) {
        if (!tradeRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        try {
            tradeRepository.deleteById(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            logger.error("Ошибка при удалении сделки", e);
            Map<String, String> error = new HashMap<>();
            error.put("message", "Ошибка удаления сделки: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    // Аналитика на основе реальных данных
    @GetMapping("/analytics/summary")
    public ResponseEntity<?> getAnalyticsSummary(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        
        List<Trade> allTrades = tradeRepository.findAll();
        
        // Фильтрация по дате, если указаны параметры
        if (startDate != null || endDate != null) {
            LocalDate start = startDate != null ? 
                LocalDate.parse(startDate) : LocalDate.of(1900, 1, 1);
            LocalDate end = endDate != null ? 
                LocalDate.parse(endDate) : LocalDate.now();
            
            allTrades = allTrades.stream()
                .filter(trade -> {
                    // Фильтруем по дате входа для открытых сделок или по дате выхода для закрытых
                    LocalDate date = trade.getExitDate() != null ? trade.getExitDate() : trade.getEntryDate();
                    return !date.isBefore(start) && !date.isAfter(end);
                })
                .collect(Collectors.toList());
        }
        
        // Считаем количество сделок
        int totalTrades = allTrades.size();
        
        // Считаем количество прибыльных сделок (только для закрытых)
        List<Trade> closedTrades = allTrades.stream()
            .filter(trade -> trade.getExitDate() != null)
            .collect(Collectors.toList());
        
        int winningTrades = 0;
        double totalProfit = 0.0;
        
        for (Trade trade : closedTrades) {
            Double profit = trade.getProfit();
            if (profit != null) {
                if (profit > 0) {
                    winningTrades++;
                }
                totalProfit += profit;
            }
        }
        
        // Рассчитываем процент успешных сделок
        double winRate = closedTrades.isEmpty() ? 0 : 
            Math.round((double) winningTrades / closedTrades.size() * 10000) / 100.0;
        
        Map<String, Object> summary = new HashMap<>();
        summary.put("totalTrades", totalTrades);
        summary.put("closedTrades", closedTrades.size());
        summary.put("winningTrades", winningTrades);
        summary.put("winRate", winRate);
        summary.put("totalProfit", Math.round(totalProfit * 100) / 100.0);
        
        return ResponseEntity.ok(summary);
    }
    
    @GetMapping("/analytics/monthly")
    public ResponseEntity<?> getMonthlyAnalytics(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        
        List<Trade> allTrades = tradeRepository.findAll();
        
        // Фильтрация по дате, если указаны параметры
        LocalDate start = startDate != null ? 
            LocalDate.parse(startDate) : LocalDate.of(LocalDate.now().getYear() - 1, 1, 1);
        LocalDate end = endDate != null ? 
            LocalDate.parse(endDate) : LocalDate.now();
        
        // Создаем карту для хранения данных по месяцам
        Map<String, Double> monthlyData = new HashMap<>();
        
        // Подготавливаем список всех месяцев в диапазоне
        LocalDate current = start.withDayOfMonth(1);
        DateTimeFormatter monthFormatter = DateTimeFormatter.ofPattern("yyyy-MM");
        
        while (!current.isAfter(end)) {
            monthlyData.put(current.format(monthFormatter), 0.0);
            current = current.plusMonths(1);
        }
        
        // Заполняем данные по закрытым сделкам
        for (Trade trade : allTrades) {
            if (trade.getExitDate() != null) {
                // Используем дату закрытия сделки
                LocalDate exitDate = trade.getExitDate();
                if (!exitDate.isBefore(start) && !exitDate.isAfter(end)) {
                    String month = exitDate.format(monthFormatter);
                    Double profit = trade.getProfit();
                    if (profit != null) {
                        monthlyData.put(month, monthlyData.getOrDefault(month, 0.0) + profit);
                    }
                }
            }
        }
        
        // Формируем список результатов по месяцам
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map.Entry<String, Double> entry : monthlyData.entrySet()) {
            Map<String, Object> monthData = new HashMap<>();
            monthData.put("month", entry.getKey());
            monthData.put("profit", Math.round(entry.getValue() * 100) / 100.0);
            result.add(monthData);
        }
        
        // Сортируем по месяцам
        result.sort((a, b) -> ((String) a.get("month")).compareTo((String) b.get("month")));
        
        return ResponseEntity.ok(result);
    }
    
    @GetMapping("/analytics/symbols")
    public ResponseEntity<?> getSymbolAnalytics(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        
        List<Trade> allTrades = tradeRepository.findAll();
        
        // Фильтрация по дате, если указаны параметры
        if (startDate != null || endDate != null) {
            LocalDate start = startDate != null ? 
                LocalDate.parse(startDate) : LocalDate.of(1900, 1, 1);
            LocalDate end = endDate != null ? 
                LocalDate.parse(endDate) : LocalDate.now();
            
            allTrades = allTrades.stream()
                .filter(trade -> {
                    // Для закрытых сделок используем дату закрытия, для открытых - дату открытия
                    LocalDate date = trade.getExitDate() != null ? trade.getExitDate() : trade.getEntryDate();
                    return !date.isBefore(start) && !date.isAfter(end);
                })
                .collect(Collectors.toList());
        }
        
        // Группируем данные по символам
        Map<String, Double> symbolData = new HashMap<>();
        Map<String, Integer> symbolCount = new HashMap<>();
        
        for (Trade trade : allTrades) {
            String symbol = trade.getSymbol();
            symbolCount.put(symbol, symbolCount.getOrDefault(symbol, 0) + 1);
            
            if (trade.getExitDate() != null) {
                Double profit = trade.getProfit();
                if (profit != null) {
                    symbolData.put(symbol, symbolData.getOrDefault(symbol, 0.0) + profit);
                }
            }
        }
        
        // Формируем результат
        List<Map<String, Object>> result = new ArrayList<>();
        for (String symbol : symbolData.keySet()) {
            Map<String, Object> data = new HashMap<>();
            data.put("symbol", symbol);
            data.put("profit", Math.round(symbolData.get(symbol) * 100) / 100.0);
            data.put("count", symbolCount.get(symbol));
            result.add(data);
        }
        
        // Сортируем по прибыли (по убыванию)
        result.sort((a, b) -> Double.compare((Double) b.get("profit"), (Double) a.get("profit")));
        
        return ResponseEntity.ok(result);
    }
}
