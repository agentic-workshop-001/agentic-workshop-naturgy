package com.naturgy.gas;

import com.naturgy.gas.entity.Invoice;
import com.naturgy.gas.repository.InvoiceRepository;
import com.naturgy.gas.service.BillingService;
import com.naturgy.gas.service.InvoicePdfService;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration test: seed → billing → invoices → PDF
 */
@SpringBootTest
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class BillingIntegrationTest {

    @Autowired BillingService billingService;
    @Autowired InvoiceRepository invoiceRepo;
    @Autowired InvoicePdfService pdfService;

    @Test
    @Order(1)
    void billing_2026_02_generates_invoices() {
        BillingService.BillingResult result = billingService.runBillingForPeriod("2026-02");

        // 3 ACTIVO supply points; all have readings for 2026-02
        assertFalse(result.invoices().isEmpty(), "Should generate at least 1 invoice");
        assertTrue(result.invoices().size() <= 3, "Max 3 invoices (3 supply points)");

        // Verify invoice number format
        for (Invoice inv : result.invoices()) {
            assertTrue(inv.getNumeroFactura().startsWith("GAS-202602-"),
                    "Invoice number should start with GAS-202602-");
            assertNotNull(inv.getBase());
            assertNotNull(inv.getImpuestos());
            assertNotNull(inv.getTotal());
            assertTrue(inv.getTotal().compareTo(inv.getBase()) > 0,
                    "Total should be greater than base (IVA applied)");
        }
    }

    @Test
    @Order(2)
    void billing_idempotent() {
        long countBefore = invoiceRepo.count();
        assertTrue(countBefore > 0, "Expected invoices from previous test");

        // Run again — should not create duplicates
        BillingService.BillingResult second = billingService.runBillingForPeriod("2026-02");
        assertEquals(0, second.invoices().size(), "Second run should create 0 new invoices");
        assertEquals(countBefore, invoiceRepo.count(), "Invoice count should not change");
    }

    @Test
    @Order(3)
    void pdf_generated_for_invoice() {
        List<Invoice> invoices = invoiceRepo.findAll();
        assertFalse(invoices.isEmpty(), "Need at least one invoice for PDF test");

        // Load invoice with lines eagerly
        Invoice invoice = invoiceRepo.findWithLinesById(invoices.get(0).getId()).orElseThrow();
        assertFalse(invoice.getLines().isEmpty(), "Invoice should have lines");

        byte[] pdf = pdfService.generatePdf(invoice);
        assertNotNull(pdf);
        assertTrue(pdf.length > 0, "PDF should not be empty");
        // PDF starts with %PDF
        assertEquals('%', (char) pdf[0]);
        assertEquals('P', (char) pdf[1]);
        assertEquals('D', (char) pdf[2]);
        assertEquals('F', (char) pdf[3]);
    }

    @Test
    @Order(4)
    void billing_invalid_period_throws() {
        assertThrows(IllegalArgumentException.class,
                () -> billingService.runBillingForPeriod("bad-period"));
    }
}
