package com.naturgy.gas.service;

import com.naturgy.gas.entity.*;
import com.naturgy.gas.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Core billing engine.
 * Implements logic-spec: m³ → kWh → fixed/variable → IVA → Invoice + Lines.
 */
@Service
public class BillingService {

    private static final Logger log = LoggerFactory.getLogger(BillingService.class);

    private final SupplyPointRepository supplyPointRepo;
    private final GasReadingRepository readingRepo;
    private final GasTariffRepository tariffRepo;
    private final GasConversionFactorRepository convFactorRepo;
    private final TaxConfigRepository taxConfigRepo;
    private final InvoiceRepository invoiceRepo;

    public BillingService(SupplyPointRepository supplyPointRepo,
                          GasReadingRepository readingRepo,
                          GasTariffRepository tariffRepo,
                          GasConversionFactorRepository convFactorRepo,
                          TaxConfigRepository taxConfigRepo,
                          InvoiceRepository invoiceRepo) {
        this.supplyPointRepo = supplyPointRepo;
        this.readingRepo = readingRepo;
        this.tariffRepo = tariffRepo;
        this.convFactorRepo = convFactorRepo;
        this.taxConfigRepo = taxConfigRepo;
        this.invoiceRepo = invoiceRepo;
    }

    public record BillingResult(List<Invoice> invoices, List<String> errors) {}

    /**
     * Runs billing for all ACTIVO supply points for the given period YYYY-MM.
     * Idempotent: existing invoices for the same (cups, period) are skipped.
     */
    @Transactional
    public BillingResult runBillingForPeriod(String period) {
        YearMonth ym;
        try {
            ym = YearMonth.parse(period);
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("Invalid period format. Expected YYYY-MM, got: " + period);
        }

        LocalDate periodStart = ym.atDay(1);
        LocalDate periodEnd   = ym.atEndOfMonth();
        int daysInMonth = ym.lengthOfMonth();

        List<SupplyPoint> activos = supplyPointRepo.findByEstado(SupplyPoint.EstadoEnum.ACTIVO);
        List<Invoice> invoices = new ArrayList<>();
        List<String> errors  = new ArrayList<>();

        // Determine invoice sequence base for this period
        long existingCount = invoiceRepo.countByPeriodoInicio(periodStart);
        long[] seq = {existingCount + 1};

        for (SupplyPoint sp : activos) {
            String cups = sp.getCups();

            // --- Skip if already billed ---
            if (invoiceRepo.findByCupsAndPeriodoInicio(cups, periodStart).isPresent()) {
                log.debug("Billing skipped (already exists): cups={} period={}", cups, period);
                continue;
            }

            // --- Boundary readings ---
            Optional<GasReading> inicio = readingRepo.findLastBefore(cups, periodStart);
            Optional<GasReading> fin    = readingRepo.findLastOnOrBefore(cups, periodEnd);

            if (inicio.isEmpty() || fin.isEmpty()) {
                String err = String.format("cups=%s period=%s: missing boundary reading (inicio=%s, fin=%s)",
                        cups, period, inicio.isPresent(), fin.isPresent());
                log.warn("Billing error: {}", err);
                errors.add(err);
                continue;
            }

            BigDecimal m3Inicio = inicio.get().getLecturaM3();
            BigDecimal m3Fin    = fin.get().getLecturaM3();
            BigDecimal m3Consumidos = m3Fin.subtract(m3Inicio);

            if (m3Consumidos.compareTo(BigDecimal.ZERO) < 0) {
                String err = String.format("cups=%s period=%s: negative consumption (%.3f)", cups, period, m3Consumidos);
                log.warn("Billing error: {}", err);
                errors.add(err);
                continue;
            }

            // --- Tariff ---
            Optional<GasTariff> tariffOpt = tariffRepo.findActiveForPeriod(sp.getTarifa(), periodEnd);
            if (tariffOpt.isEmpty()) {
                String err = String.format("cups=%s period=%s: no active tariff for '%s'", cups, period, sp.getTarifa());
                log.warn("Billing error: {}", err);
                errors.add(err);
                continue;
            }
            GasTariff tariff = tariffOpt.get();

            // --- Conversion factor ---
            Optional<GasConversionFactor> cfOpt = convFactorRepo.findByZonaAndMes(sp.getZona(), period);
            if (cfOpt.isEmpty()) {
                String err = String.format("cups=%s period=%s: no conversion factor for zona='%s' mes='%s'",
                        cups, period, sp.getZona(), period);
                log.warn("Billing error: {}", err);
                errors.add(err);
                continue;
            }
            GasConversionFactor cf = cfOpt.get();

            // --- Tax (IVA) ---
            Optional<TaxConfig> taxOpt = taxConfigRepo.findActiveForPeriod("IVA", periodEnd);
            if (taxOpt.isEmpty()) {
                String err = String.format("cups=%s period=%s: no IVA tax configured", cups, period);
                log.warn("Billing error: {}", err);
                errors.add(err);
                continue;
            }
            TaxConfig tax = taxOpt.get();

            // --- Calculations (per logic-spec) ---
            // kwh = m3_consumidos * coef_conv * pcs_kwh_m3
            BigDecimal kwh = m3Consumidos
                    .multiply(cf.getCoefConv())
                    .multiply(cf.getPcsKwhM3())
                    .setScale(3, RoundingMode.HALF_UP);

            // coste_fijo = fijo_mes_eur * (days_in_period / days_in_month)
            // For monthly billing: effectively fijo_mes_eur itself
            BigDecimal costeFijo = tariff.getFijoMesEur()
                    .multiply(new BigDecimal(daysInMonth))
                    .divide(new BigDecimal(daysInMonth), 2, RoundingMode.HALF_UP);

            // coste_variable = kwh * variable_eur_kwh
            BigDecimal costeVariable = kwh
                    .multiply(tariff.getVariableEurKwh())
                    .setScale(2, RoundingMode.HALF_UP);

            // alquiler: workshop default 0.00
            BigDecimal alquiler = BigDecimal.ZERO.setScale(2);

            // base = coste_fijo + coste_variable + alquiler
            BigDecimal base = costeFijo.add(costeVariable).add(alquiler).setScale(2, RoundingMode.HALF_UP);

            // impuestos = base * iva_rate
            BigDecimal impuestos = base.multiply(tax.getTaxRate()).setScale(2, RoundingMode.HALF_UP);

            // total = base + impuestos
            BigDecimal total = base.add(impuestos).setScale(2, RoundingMode.HALF_UP);

            // --- Invoice number ---
            String numeroFactura = String.format("GAS-%s-%s-%03d", period.replace("-", ""), cups, seq[0]++);

            // --- Build Invoice ---
            Invoice invoice = new Invoice(numeroFactura, cups, periodStart, periodEnd,
                    base, impuestos, total, LocalDate.now());

            // Lines
            invoice.getLines().add(new InvoiceLine(invoice,
                    InvoiceLine.TipoLineaEnum.TERMINO_FIJO, "Término fijo",
                    BigDecimal.ONE, tariff.getFijoMesEur(), costeFijo));

            invoice.getLines().add(new InvoiceLine(invoice,
                    InvoiceLine.TipoLineaEnum.TERMINO_VARIABLE, "Término variable",
                    kwh, tariff.getVariableEurKwh(), costeVariable));

            if (alquiler.compareTo(BigDecimal.ZERO) > 0) {
                invoice.getLines().add(new InvoiceLine(invoice,
                        InvoiceLine.TipoLineaEnum.ALQUILER, "Alquiler",
                        BigDecimal.ONE, alquiler, alquiler));
            }

            invoice.getLines().add(new InvoiceLine(invoice,
                    InvoiceLine.TipoLineaEnum.IVA, "IVA",
                    tax.getTaxRate(), base, impuestos));

            invoiceRepo.save(invoice);
            invoices.add(invoice);
            log.info("Invoice created: {} cups={} total={}", numeroFactura, cups, total);
        }

        return new BillingResult(invoices, errors);
    }
}
