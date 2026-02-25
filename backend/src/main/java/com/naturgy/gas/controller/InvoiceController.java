package com.naturgy.gas.controller;

import com.naturgy.gas.entity.Invoice;
import com.naturgy.gas.repository.InvoiceRepository;
import com.naturgy.gas.service.InvoicePdfService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/gas/invoices")
public class InvoiceController {

    private final InvoiceRepository repo;
    private final InvoicePdfService pdfService;

    public InvoiceController(InvoiceRepository repo, InvoicePdfService pdfService) {
        this.repo = repo;
        this.pdfService = pdfService;
    }

    @GetMapping
    public List<Invoice> getAll(
            @RequestParam(required = false) String cups,
            @RequestParam(required = false) String period) {
        if (cups != null && period != null) {
            // period expected YYYY-MM
            java.time.LocalDate periodStart = java.time.YearMonth.parse(period).atDay(1);
            return repo.findByCupsAndPeriodoInicio(cups, periodStart)
                    .map(List::of)
                    .orElse(List.of());
        }
        return repo.findAll();
    }

    @GetMapping("/{id}")
    public Invoice getById(@PathVariable Long id) {
        return repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Invoice not found: " + id));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        if (!repo.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Invoice not found: " + id);
        }
        repo.deleteById(id);
    }

    /**
     * GET /api/gas/invoices/{id}/pdf
     * Returns invoice as a PDF file.
     */
    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> downloadPdf(@PathVariable Long id) {
        Invoice invoice = repo.findWithLinesById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Invoice not found: " + id));

        byte[] pdf = pdfService.generatePdf(invoice);
        String filename = "factura-" + invoice.getNumeroFactura() + ".pdf";

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(pdf);
    }
}
