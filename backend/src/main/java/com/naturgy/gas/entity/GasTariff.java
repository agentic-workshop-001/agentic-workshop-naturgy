package com.naturgy.gas.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "gas_tariff",
       uniqueConstraints = @UniqueConstraint(columnNames = {"tarifa", "vigencia_desde"}))
public class GasTariff {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tarifa", nullable = false)
    private String tarifa;

    @Column(name = "fijo_mes_eur", nullable = false, precision = 10, scale = 4)
    private BigDecimal fijoMesEur;

    @Column(name = "variable_eur_kwh", nullable = false, precision = 10, scale = 6)
    private BigDecimal variableEurKwh;

    @Column(name = "vigencia_desde", nullable = false)
    private LocalDate vigenciaDesde;

    public GasTariff() {}

    public GasTariff(String tarifa, BigDecimal fijoMesEur, BigDecimal variableEurKwh, LocalDate vigenciaDesde) {
        this.tarifa = tarifa;
        this.fijoMesEur = fijoMesEur;
        this.variableEurKwh = variableEurKwh;
        this.vigenciaDesde = vigenciaDesde;
    }

    public Long getId() { return id; }
    public String getTarifa() { return tarifa; }
    public void setTarifa(String tarifa) { this.tarifa = tarifa; }
    public BigDecimal getFijoMesEur() { return fijoMesEur; }
    public void setFijoMesEur(BigDecimal fijoMesEur) { this.fijoMesEur = fijoMesEur; }
    public BigDecimal getVariableEurKwh() { return variableEurKwh; }
    public void setVariableEurKwh(BigDecimal variableEurKwh) { this.variableEurKwh = variableEurKwh; }
    public LocalDate getVigenciaDesde() { return vigenciaDesde; }
    public void setVigenciaDesde(LocalDate vigenciaDesde) { this.vigenciaDesde = vigenciaDesde; }
}
