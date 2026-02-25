package com.naturgy.gas.controller;

import com.naturgy.gas.entity.GasReading;
import com.naturgy.gas.repository.GasReadingRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/gas/readings")
public class GasReadingController {

    private final GasReadingRepository repo;

    public GasReadingController(GasReadingRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<GasReading> getAll(
            @RequestParam(required = false) String cups) {
        if (cups != null) {
            return repo.findByIdCupsOrderByIdFechaAsc(cups);
        }
        return repo.findAll();
    }

    @GetMapping("/{cups}/{fecha}")
    public GasReading getById(@PathVariable String cups, @PathVariable String fecha) {
        LocalDate date = parseDate(fecha);
        GasReading.GasReadingId id = new GasReading.GasReadingId(cups, date);
        return repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Reading not found: " + cups + "/" + fecha));
    }

    @PostMapping
    public ResponseEntity<GasReading> create(@RequestBody CreateReadingRequest request) {
        // Validate required fields
        if (request.getCups() == null || request.getCups().trim().isEmpty()) {
            throw new IllegalArgumentException("cups es obligatorio");
        }
        if (request.getFecha() == null || request.getFecha().trim().isEmpty()) {
            throw new IllegalArgumentException("fecha es obligatoria");
        }
        if (request.getLecturaM3() == null) {
            throw new IllegalArgumentException("lecturaM3 es obligatoria");
        }
        if (request.getLecturaM3().compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("lecturaM3 debe ser >= 0");
        }
        if (request.getTipo() == null || request.getTipo().trim().isEmpty()) {
            throw new IllegalArgumentException("tipo es obligatorio");
        }

        // Parse date
        LocalDate fecha = parseDate(request.getFecha());

        // Parse tipo enum
        GasReading.TipoEnum tipo;
        try {
            tipo = GasReading.TipoEnum.valueOf(request.getTipo().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("tipo debe ser REAL o ESTIMADA");
        }

        // Create ID and check for duplicates
        GasReading.GasReadingId id = new GasReading.GasReadingId(request.getCups(), fecha);
        if (repo.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Reading already exists: " + request.getCups() + "/" + request.getFecha());
        }

        // Create and save
        GasReading reading = new GasReading(request.getCups(), fecha, request.getLecturaM3(), tipo);
        return ResponseEntity.status(HttpStatus.CREATED).body(repo.save(reading));
    }

    @DeleteMapping("/{cups}/{fecha}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String cups, @PathVariable String fecha) {
        LocalDate date = parseDate(fecha);
        GasReading.GasReadingId id = new GasReading.GasReadingId(cups, date);
        if (!repo.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Reading not found: " + cups + "/" + fecha);
        }
        repo.deleteById(id);
    }

    /**
     * CSV import endpoint. Expects multipart/form-data with field "file".
     * Returns {inserted, skipped, errors[]}.
     */
    @PostMapping("/import")
    public Map<String, Object> importCsv(@RequestParam("file") MultipartFile file) {
        int inserted = 0, skipped = 0;
        List<String> errors = new ArrayList<>();

        try (BufferedReader br = new BufferedReader(new InputStreamReader(file.getInputStream()))) {
            String header = br.readLine(); // skip header
            if (header == null) {
                return Map.of("inserted", 0, "skipped", 0, "errors", List.of("Empty file"));
            }
            String line;
            int row = 1;
            while ((line = br.readLine()) != null) {
                row++;
                line = line.trim();
                if (line.isEmpty()) continue;
                String[] cols = line.split(",", -1);
                if (cols.length < 4) {
                    errors.add("Row " + row + ": expected 4 columns, got " + cols.length);
                    continue;
                }
                String cups = cols[0].trim();
                String fechaStr = cols[1].trim();
                String lecturaStr = cols[2].trim();
                String tipoStr = cols[3].trim();

                LocalDate fecha;
                try { fecha = LocalDate.parse(fechaStr); }
                catch (DateTimeParseException e) {
                    errors.add("Row " + row + ": invalid date '" + fechaStr + "'");
                    continue;
                }

                BigDecimal lecturaM3;
                try { lecturaM3 = new BigDecimal(lecturaStr); }
                catch (NumberFormatException e) {
                    errors.add("Row " + row + ": invalid lectura_m3 '" + lecturaStr + "'");
                    continue;
                }
                if (lecturaM3.compareTo(BigDecimal.ZERO) < 0) {
                    errors.add("Row " + row + ": lectura_m3 < 0");
                    continue;
                }

                GasReading.TipoEnum tipo;
                try { tipo = GasReading.TipoEnum.valueOf(tipoStr); }
                catch (IllegalArgumentException e) {
                    errors.add("Row " + row + ": invalid tipo '" + tipoStr + "'");
                    continue;
                }

                GasReading.GasReadingId id = new GasReading.GasReadingId(cups, fecha);
                if (repo.existsById(id)) {
                    errors.add("Row " + row + ": duplicate reading " + cups + "/" + fecha);
                    skipped++;
                    continue;
                }
                repo.save(new GasReading(cups, fecha, lecturaM3, tipo));
                inserted++;
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse CSV: " + e.getMessage(), e);
        }

        return Map.of("inserted", inserted, "skipped", skipped, "errors", errors);
    }

    private LocalDate parseDate(String s) {
        try { return LocalDate.parse(s); }
        catch (DateTimeParseException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid date: " + s);
        }
    }
}
