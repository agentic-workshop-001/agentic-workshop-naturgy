package com.naturgy.gas.controller;

import com.naturgy.gas.entity.SupplyPoint;
import com.naturgy.gas.repository.SupplyPointRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/gas/supply-points")
public class SupplyPointController {

    private final SupplyPointRepository repo;

    public SupplyPointController(SupplyPointRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<SupplyPoint> getAll() {
        return repo.findAll();
    }

    @GetMapping("/{cups}")
    public SupplyPoint getById(@PathVariable String cups) {
        return repo.findById(cups)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Supply point not found: " + cups));
    }

    @PostMapping
    public ResponseEntity<SupplyPoint> create(@RequestBody SupplyPoint sp) {
        if (sp.getCups() == null || sp.getCups().isBlank()) {
            throw new IllegalArgumentException("cups must not be blank");
        }
        if (repo.existsById(sp.getCups())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Supply point already exists: " + sp.getCups());
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(repo.save(sp));
    }

    @PutMapping("/{cups}")
    public SupplyPoint update(@PathVariable String cups, @RequestBody SupplyPoint sp) {
        if (!repo.existsById(cups)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Supply point not found: " + cups);
        }
        sp.setCups(cups);
        return repo.save(sp);
    }

    @DeleteMapping("/{cups}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String cups) {
        if (!repo.existsById(cups)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Supply point not found: " + cups);
        }
        repo.deleteById(cups);
    }
}
