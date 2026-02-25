package com.naturgy.gas.controller;

import com.naturgy.gas.entity.TaxConfig;
import com.naturgy.gas.repository.TaxConfigRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/gas/taxes")
public class TaxConfigController {

    private final TaxConfigRepository repo;

    public TaxConfigController(TaxConfigRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<TaxConfig> getAll() {
        return repo.findAll();
    }

    @GetMapping("/{id}")
    public TaxConfig getById(@PathVariable Long id) {
        return repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Tax config not found: " + id));
    }

    @PostMapping
    public ResponseEntity<TaxConfig> create(@RequestBody TaxConfig tax) {
        if (tax.getTaxCode() == null || tax.getTaxCode().isBlank()) {
            throw new IllegalArgumentException("taxCode must not be blank");
        }
        if (tax.getVigenciaDesde() != null &&
                repo.existsByTaxCodeAndVigenciaDesde(tax.getTaxCode(), tax.getVigenciaDesde())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Tax config already exists: " + tax.getTaxCode() + " / " + tax.getVigenciaDesde());
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(repo.save(tax));
    }

    @PutMapping("/{id}")
    public TaxConfig update(@PathVariable Long id, @RequestBody TaxConfig tax) {
        TaxConfig existing = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Tax config not found: " + id));
        existing.setTaxCode(tax.getTaxCode());
        existing.setTaxRate(tax.getTaxRate());
        existing.setVigenciaDesde(tax.getVigenciaDesde());
        return repo.save(existing);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        if (!repo.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Tax config not found: " + id);
        }
        repo.deleteById(id);
    }
}
