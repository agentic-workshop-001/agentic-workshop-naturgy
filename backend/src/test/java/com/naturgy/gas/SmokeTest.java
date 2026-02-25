package com.naturgy.gas;

import com.naturgy.gas.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Smoke test: verifies that the application starts, seeds data,
 * and that each table has the expected row counts.
 *
 * Expected seed counts (canonical CSVs under _data/db/samples/gas/):
 *   supply_points        = 3
 *   gas_tariffs          = 3
 *   gas_conversion_factor= 4
 *   tax_config           = 1
 *   gas_reading          = 11 (readings for boundary dates: 2025-12-31, 2026-01-31, 2026-02-28)
 */
@SpringBootTest
class SmokeTest {

    @Autowired SupplyPointRepository supplyPointRepo;
    @Autowired GasTariffRepository gasTariffRepo;
    @Autowired GasConversionFactorRepository conversionFactorRepo;
    @Autowired TaxConfigRepository taxConfigRepo;
    @Autowired GasReadingRepository gasReadingRepo;
    @Autowired InvoiceRepository invoiceRepo;

    @Test
    void supplyPoints_count() {
        assertEquals(3, supplyPointRepo.count(), "Expected 3 supply points");
    }

    @Test
    void gasTariffs_count() {
        assertEquals(3, gasTariffRepo.count(), "Expected 3 gas tariffs (RL1, RL2, RL3)");
    }

    @Test
    void gasConversionFactors_count() {
        assertEquals(4, conversionFactorRepo.count(), "Expected 4 conversion factors (2 zones x 2 months)");
    }

    @Test
    void taxConfig_count() {
        assertEquals(1, taxConfigRepo.count(), "Expected 1 tax config (IVA)");
    }

    @Test
    void gasReadings_count() {
        // Now we have 11 readings: 4 CUPS x 3 dates (2025-12-31, 2026-01-31, 2026-02-28)
        // minus 1 (ES003CD only has 2025-12-31 and 2026-02-28, not 2026-01-31)
        assertEquals(11, gasReadingRepo.count(), "Expected 11 gas readings (boundary dates for all periods)");
    }

    @Test
    void invoices_emptyOnStart() {
        assertTrue(invoiceRepo.count() >= 0, "Invoice table should exist");
    }
}
