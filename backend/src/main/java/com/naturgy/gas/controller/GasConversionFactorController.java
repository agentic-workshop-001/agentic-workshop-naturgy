package com.naturgy.gas.controller;

import com.naturgy.gas.entity.GasConversionFactor;
import com.naturgy.gas.repository.GasConversionFactorRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/gas/conversion-factors")
public class GasConversionFactorController {

    private final GasConversionFactorRepository repo;

    public GasConversionFactorController(GasConversionFactorRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<GasConversionFactor> getAll() {
        return repo.findAll();
    }

    @GetMapping("/{id}")
    public GasConversionFactor getById(@PathVariable Long id) {
        return repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Conversion factor not found: " + id));
    }

    @PostMapping
    public ResponseEntity<GasConversionFactor> create(@RequestBody GasConversionFactor cf) {
        if (cf.getZona() == null || cf.getMes() == null) {
            throw new IllegalArgumentException("zona and mes are required");
        }
        if (repo.existsByZonaAndMes(cf.getZona(), cf.getMes())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Conversion factor already exists: " + cf.getZona() + "/" + cf.getMes());
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(repo.save(cf));
    }

    @PutMapping("/{id}")
    public GasConversionFactor update(@PathVariable Long id, @RequestBody GasConversionFactor cf) {
        GasConversionFactor existing = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Conversion factor not found: " + id));
        existing.setZona(cf.getZona());
        existing.setMes(cf.getMes());
        existing.setCoefConv(cf.getCoefConv());
        existing.setPcsKwhM3(cf.getPcsKwhM3());
        return repo.save(existing);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        if (!repo.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Conversion factor not found: " + id);
        }
        repo.deleteById(id);
    }
}
