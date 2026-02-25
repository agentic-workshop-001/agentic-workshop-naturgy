package com.naturgy.gas.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "supply_point")
public class SupplyPoint {

    @Id
    @Column(name = "cups", nullable = false, unique = true)
    private String cups;

    @Column(name = "zona", nullable = false)
    private String zona;

    @Column(name = "tarifa", nullable = false)
    private String tarifa;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false)
    private EstadoEnum estado;

    public enum EstadoEnum { ACTIVO, INACTIVO }

    public SupplyPoint() {}

    public SupplyPoint(String cups, String zona, String tarifa, EstadoEnum estado) {
        this.cups = cups;
        this.zona = zona;
        this.tarifa = tarifa;
        this.estado = estado;
    }

    public String getCups() { return cups; }
    public void setCups(String cups) { this.cups = cups; }
    public String getZona() { return zona; }
    public void setZona(String zona) { this.zona = zona; }
    public String getTarifa() { return tarifa; }
    public void setTarifa(String tarifa) { this.tarifa = tarifa; }
    public EstadoEnum getEstado() { return estado; }
    public void setEstado(EstadoEnum estado) { this.estado = estado; }
}
