package com.naturgy.gas.seed;

import com.naturgy.gas.entity.*;
import com.naturgy.gas.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Optional;

/**
 * Seeds the database from CSV files found under:
 *   A) {dataDir}/gas/{specFileName}       (canonical per spec)
 *   B) {dataDir}/sample_{specFileName}    (fallback for current sample files)
 *
 * Idempotent: re-running does not duplicate rows.
 * Invalid dates are skipped with WARN; missing CSVs boot without error.
 */
@Component
public class SeedService implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SeedService.class);

    @Value("${gas.data.dir:_data/db/samples}")
    private String dataDir;

    private final SupplyPointRepository supplyPointRepo;
    private final GasTariffRepository gasTariffRepo;
    private final GasConversionFactorRepository conversionFactorRepo;
    private final TaxConfigRepository taxConfigRepo;
    private final GasReadingRepository gasReadingRepo;

    public SeedService(SupplyPointRepository supplyPointRepo,
                       GasTariffRepository gasTariffRepo,
                       GasConversionFactorRepository conversionFactorRepo,
                       TaxConfigRepository taxConfigRepo,
                       GasReadingRepository gasReadingRepo) {
        this.supplyPointRepo = supplyPointRepo;
        this.gasTariffRepo = gasTariffRepo;
        this.conversionFactorRepo = conversionFactorRepo;
        this.taxConfigRepo = taxConfigRepo;
        this.gasReadingRepo = gasReadingRepo;
    }

    @Override
    public void run(ApplicationArguments args) {
        log.info("Seed: data directory = {}", dataDir);

        seedSupplyPoints(dataDir);
        seedGasTariffs(dataDir);
        seedGasConversionFactors(dataDir);
        seedTaxes(dataDir);
        seedGasReadings(dataDir);

        log.info("Seed complete. supply_points={}, gas_tariffs={}, conversion_factors={}, " +
                 "tax_configs={}, gas_readings={}",
                supplyPointRepo.count(),
                gasTariffRepo.count(),
                conversionFactorRepo.count(),
                taxConfigRepo.count(),
                gasReadingRepo.count());
    }

    // -------------------------------------------------------------------------
    // Seeders
    // -------------------------------------------------------------------------

    private void seedSupplyPoints(String dataDir) {
        Optional<Path> path = resolveCsvPath(dataDir, "supply-points.csv");
        if (path.isEmpty()) return;

        try (BufferedReader br = Files.newBufferedReader(path.get())) {
            String header = br.readLine(); // skip header
            if (header == null) return;
            String line;
            int inserted = 0, skipped = 0;
            while ((line = br.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty()) continue;
                String[] cols = line.split(",", -1);
                if (cols.length < 4) {
                    log.warn("supply-points.csv: malformed row (expected 4 cols): {}", line);
                    continue;
                }
                String cups = cols[0].trim();
                String zona = cols[1].trim();
                String tarifa = cols[2].trim();
                String estadoStr = cols[3].trim();

                if (cups.isBlank()) { log.warn("supply-points: blank cups, skipping"); continue; }
                SupplyPoint.EstadoEnum estado;
                try { estado = SupplyPoint.EstadoEnum.valueOf(estadoStr); }
                catch (IllegalArgumentException e) {
                    log.warn("supply-points: invalid estado '{}', skipping row: {}", estadoStr, line);
                    continue;
                }

                if (supplyPointRepo.existsById(cups)) { skipped++; continue; }
                supplyPointRepo.save(new SupplyPoint(cups, zona, tarifa, estado));
                inserted++;
            }
            log.info("supply-points: inserted={}, skipped={}", inserted, skipped);
        } catch (IOException e) {
            throw new RuntimeException("Failed to read supply-points.csv: " + e.getMessage(), e);
        }
    }

    private void seedGasTariffs(String dataDir) {
        Optional<Path> path = resolveCsvPath(dataDir, "gas-tariffs.csv");
        if (path.isEmpty()) return;

        try (BufferedReader br = Files.newBufferedReader(path.get())) {
            String header = br.readLine();
            if (header == null) return;
            String line;
            int inserted = 0, skipped = 0;
            while ((line = br.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty()) continue;
                String[] cols = line.split(",", -1);
                if (cols.length < 4) {
                    log.warn("gas-tariffs.csv: malformed row: {}", line);
                    continue;
                }
                String tarifa = cols[0].trim();
                BigDecimal fijoMesEur = new BigDecimal(cols[1].trim());
                BigDecimal variableEurKwh = new BigDecimal(cols[2].trim());
                LocalDate vigenciaDesde = LocalDate.parse(cols[3].trim());

                if (gasTariffRepo.existsByTarifaAndVigenciaDesde(tarifa, vigenciaDesde)) { skipped++; continue; }
                gasTariffRepo.save(new GasTariff(tarifa, fijoMesEur, variableEurKwh, vigenciaDesde));
                inserted++;
            }
            log.info("gas-tariffs: inserted={}, skipped={}", inserted, skipped);
        } catch (IOException e) {
            throw new RuntimeException("Failed to read gas-tariffs.csv: " + e.getMessage(), e);
        }
    }

    private void seedGasConversionFactors(String dataDir) {
        Optional<Path> path = resolveCsvPath(dataDir, "gas-conversion-factors.csv");
        if (path.isEmpty()) return;

        try (BufferedReader br = Files.newBufferedReader(path.get())) {
            String header = br.readLine();
            if (header == null) return;
            String line;
            int inserted = 0, skipped = 0;
            while ((line = br.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty()) continue;
                String[] cols = line.split(",", -1);
                if (cols.length < 4) {
                    log.warn("gas-conversion-factors.csv: malformed row: {}", line);
                    continue;
                }
                String zona = cols[0].trim();
                String mes = cols[1].trim();
                BigDecimal coefConv = new BigDecimal(cols[2].trim());
                BigDecimal pcsKwhM3 = new BigDecimal(cols[3].trim());

                if (conversionFactorRepo.existsByZonaAndMes(zona, mes)) { skipped++; continue; }
                conversionFactorRepo.save(new GasConversionFactor(zona, mes, coefConv, pcsKwhM3));
                inserted++;
            }
            log.info("gas-conversion-factors: inserted={}, skipped={}", inserted, skipped);
        } catch (IOException e) {
            throw new RuntimeException("Failed to read gas-conversion-factors.csv: " + e.getMessage(), e);
        }
    }

    private void seedTaxes(String dataDir) {
        Optional<Path> path = resolveCsvPath(dataDir, "taxes.csv");
        if (path.isEmpty()) return;

        try (BufferedReader br = Files.newBufferedReader(path.get())) {
            String header = br.readLine();
            if (header == null) return;
            String line;
            int inserted = 0, skipped = 0;
            while ((line = br.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty()) continue;
                String[] cols = line.split(",", -1);
                if (cols.length < 3) {
                    log.warn("taxes.csv: malformed row: {}", line);
                    continue;
                }
                String taxCode = cols[0].trim();
                BigDecimal taxRate = new BigDecimal(cols[1].trim());
                LocalDate vigenciaDesde = LocalDate.parse(cols[2].trim());

                if (taxConfigRepo.existsByTaxCodeAndVigenciaDesde(taxCode, vigenciaDesde)) { skipped++; continue; }
                taxConfigRepo.save(new TaxConfig(taxCode, taxRate, vigenciaDesde));
                inserted++;
            }
            log.info("taxes: inserted={}, skipped={}", inserted, skipped);
        } catch (IOException e) {
            throw new RuntimeException("Failed to read taxes.csv: " + e.getMessage(), e);
        }
    }

    private void seedGasReadings(String dataDir) {
        Optional<Path> path = resolveCsvPath(dataDir, "gas-readings.csv");
        if (path.isEmpty()) return;

        try (BufferedReader br = Files.newBufferedReader(path.get())) {
            String header = br.readLine();
            if (header == null) return;
            String line;
            int inserted = 0, skipped = 0, invalidDate = 0;
            while ((line = br.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty()) continue;
                String[] cols = line.split(",", -1);
                if (cols.length < 4) {
                    log.warn("gas-readings.csv: malformed row: {}", line);
                    continue;
                }
                String cups = cols[0].trim();
                String fechaStr = cols[1].trim();
                String lecturaStr = cols[2].trim();
                String tipoStr = cols[3].trim();

                LocalDate fecha;
                try { fecha = LocalDate.parse(fechaStr); }
                catch (DateTimeParseException e) {
                    log.warn("gas-readings: invalid date '{}', skipping row: {}", fechaStr, line);
                    invalidDate++;
                    continue;
                }

                BigDecimal lecturaM3 = new BigDecimal(lecturaStr);
                if (lecturaM3.compareTo(BigDecimal.ZERO) < 0) {
                    log.warn("gas-readings: lectura_m3 < 0, skipping row: {}", line);
                    continue;
                }

                GasReading.TipoEnum tipo;
                try { tipo = GasReading.TipoEnum.valueOf(tipoStr); }
                catch (IllegalArgumentException e) {
                    log.warn("gas-readings: invalid tipo '{}', skipping row: {}", tipoStr, line);
                    continue;
                }

                GasReading.GasReadingId id = new GasReading.GasReadingId(cups, fecha);
                if (gasReadingRepo.existsById(id)) { skipped++; continue; }
                gasReadingRepo.save(new GasReading(cups, fecha, lecturaM3, tipo));
                inserted++;
            }
            log.info("gas-readings: inserted={}, skipped={}, invalidDate={}", inserted, skipped, invalidDate);
        } catch (IOException e) {
            throw new RuntimeException("Failed to read gas-readings.csv: " + e.getMessage(), e);
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Looks for the CSV in:
     *   A) {dataDir}/gas/{specFileName}
     *   B) {dataDir}/sample_{specFileName}
     * Returns empty if neither exists (logs WARN).
     */
    private Optional<Path> resolveCsvPath(String dataDir, String specFileName) {
        Path canonical = Paths.get(dataDir, "gas", specFileName);
        if (Files.exists(canonical)) {
            log.debug("CSV resolved (canonical): {}", canonical);
            return Optional.of(canonical);
        }
        Path fallback = Paths.get(dataDir, "sample_" + specFileName);
        if (Files.exists(fallback)) {
            log.debug("CSV resolved (fallback): {}", fallback);
            return Optional.of(fallback);
        }
        log.warn("CSV not found for '{}' (checked {} and {}); skipping.", specFileName, canonical, fallback);
        return Optional.empty();
    }
}
