package com.naturgy.gas.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "tax_config",
       uniqueConstraints = @UniqueConstraint(columnNames = {"tax_code", "vigencia_desde"}))
public class TaxConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tax_code", nullable = false)
    private String taxCode;

    @Column(name = "tax_rate", nullable = false, precision = 5, scale = 4)
    private BigDecimal taxRate;

    @Column(name = "vigencia_desde", nullable = false)
    private LocalDate vigenciaDesde;

    public TaxConfig() {}

    public TaxConfig(String taxCode, BigDecimal taxRate, LocalDate vigenciaDesde) {
        this.taxCode = taxCode;
        this.taxRate = taxRate;
        this.vigenciaDesde = vigenciaDesde;
    }

    public Long getId() { return id; }
    public String getTaxCode() { return taxCode; }
    public void setTaxCode(String taxCode) { this.taxCode = taxCode; }
    public BigDecimal getTaxRate() { return taxRate; }
    public void setTaxRate(BigDecimal taxRate) { this.taxRate = taxRate; }
    public LocalDate getVigenciaDesde() { return vigenciaDesde; }
    public void setVigenciaDesde(LocalDate vigenciaDesde) { this.vigenciaDesde = vigenciaDesde; }
}
