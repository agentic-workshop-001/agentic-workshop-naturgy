package com.naturgy.gas.controller;

import com.naturgy.gas.entity.GasTariff;
import com.naturgy.gas.repository.GasTariffRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/gas/tariffs")
public class GasTariffController {

    private final GasTariffRepository repo;

    public GasTariffController(GasTariffRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<GasTariff> getAll() {
        return repo.findAll();
    }

    @GetMapping("/{id}")
    public GasTariff getById(@PathVariable Long id) {
        return repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Tariff not found: " + id));
    }

    @PostMapping
    public ResponseEntity<GasTariff> create(@RequestBody GasTariff tariff) {
        if (tariff.getTarifa() == null || tariff.getTarifa().isBlank()) {
            throw new IllegalArgumentException("tarifa must not be blank");
        }
        if (tariff.getVigenciaDesde() != null &&
                repo.existsByTarifaAndVigenciaDesde(tariff.getTarifa(), tariff.getVigenciaDesde())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Tariff already exists: " + tariff.getTarifa() + " / " + tariff.getVigenciaDesde());
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(repo.save(tariff));
    }

    @PutMapping("/{id}")
    public GasTariff update(@PathVariable Long id, @RequestBody GasTariff tariff) {
        if (!repo.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Tariff not found: " + id);
        }
        tariff = new GasTariff(tariff.getTarifa(), tariff.getFijoMesEur(),
                tariff.getVariableEurKwh(), tariff.getVigenciaDesde());
        // persist with existing id
        GasTariff existing = repo.findById(id).get();
        existing.setTarifa(tariff.getTarifa());
        existing.setFijoMesEur(tariff.getFijoMesEur());
        existing.setVariableEurKwh(tariff.getVariableEurKwh());
        existing.setVigenciaDesde(tariff.getVigenciaDesde());
        return repo.save(existing);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        if (!repo.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Tariff not found: " + id);
        }
        repo.deleteById(id);
    }
}
