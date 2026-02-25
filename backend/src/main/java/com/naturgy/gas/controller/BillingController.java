package com.naturgy.gas.controller;

import com.naturgy.gas.service.BillingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/gas/billing")
public class BillingController {

    private final BillingService billingService;

    public BillingController(BillingService billingService) {
        this.billingService = billingService;
    }

    /**
     * POST /api/gas/billing/run?period=YYYY-MM
     * Runs billing for all ACTIVO supply points for the given period.
     * Returns summary with invoice count and any errors.
     */
    @PostMapping("/run")
    public ResponseEntity<Map<String, Object>> run(@RequestParam String period) {
        BillingService.BillingResult result = billingService.runBillingForPeriod(period);
        return ResponseEntity.ok(Map.of(
                "period", period,
                "invoicesCreated", result.invoices().size(),
                "errors", result.errors()
        ));
    }
}
