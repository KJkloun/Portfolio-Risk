package com.example.diary.controller;

import com.example.diary.model.Trade;
import com.example.diary.repository.TradeRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureWebMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureWebMvc
@ActiveProfiles("test")
@Transactional
public class TradeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private TradeRepository tradeRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        tradeRepository.deleteAll();
    }

    @Test
    void shouldGetAllTrades() throws Exception {
        // Given
        Trade trade = createTestTrade("SBER", BigDecimal.valueOf(250.0), 100);
        tradeRepository.save(trade);

        // When & Then
        mockMvc.perform(get("/trades"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].symbol", is("SBER")))
                .andExpect(jsonPath("$[0].entryPrice", is(250.0)))
                .andExpect(jsonPath("$[0].quantity", is(100)));
    }

    @Test
    void shouldCreateNewTrade() throws Exception {
        // Given
        Trade newTrade = createTestTrade("GAZP", BigDecimal.valueOf(170.5), 50);
        String tradeJson = objectMapper.writeValueAsString(newTrade);

        // When & Then
        mockMvc.perform(post("/trades")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(tradeJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.symbol", is("GAZP")))
                .andExpect(jsonPath("$.entryPrice", is(170.5)))
                .andExpect(jsonPath("$.quantity", is(50)));
    }

    @Test
    void shouldUpdateExistingTrade() throws Exception {
        // Given
        Trade existingTrade = createTestTrade("SBER", BigDecimal.valueOf(250.0), 100);
        Trade savedTrade = tradeRepository.save(existingTrade);
        
        savedTrade.setExitPrice(BigDecimal.valueOf(260.0));
        savedTrade.setExitDate(LocalDate.now());
        
        String updatedTradeJson = objectMapper.writeValueAsString(savedTrade);

        // When & Then
        mockMvc.perform(put("/trades/" + savedTrade.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updatedTradeJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.exitPrice", is(260.0)))
                .andExpect(jsonPath("$.exitDate", notNullValue()));
    }

    @Test
    void shouldDeleteTrade() throws Exception {
        // Given
        Trade trade = createTestTrade("SBER", BigDecimal.valueOf(250.0), 100);
        Trade savedTrade = tradeRepository.save(trade);

        // When & Then
        mockMvc.perform(delete("/trades/" + savedTrade.getId()))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/trades/" + savedTrade.getId()))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldReturn404ForNonExistentTrade() throws Exception {
        mockMvc.perform(get("/trades/999"))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldValidateTradeData() throws Exception {
        // Given - invalid trade with empty symbol
        Trade invalidTrade = new Trade();
        invalidTrade.setSymbol("");
        invalidTrade.setEntryPrice(BigDecimal.valueOf(-100)); // negative price
        
        String invalidTradeJson = objectMapper.writeValueAsString(invalidTrade);

        // When & Then
        mockMvc.perform(post("/trades")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidTradeJson))
                .andExpect(status().isBadRequest());
    }

    private Trade createTestTrade(String symbol, BigDecimal entryPrice, Integer quantity) {
        Trade trade = new Trade();
        trade.setSymbol(symbol);
        trade.setEntryPrice(entryPrice);
        trade.setQuantity(quantity);
        trade.setEntryDate(LocalDate.now());
        trade.setMarginAmount(BigDecimal.valueOf(10.0));
        return trade;
    }
} 