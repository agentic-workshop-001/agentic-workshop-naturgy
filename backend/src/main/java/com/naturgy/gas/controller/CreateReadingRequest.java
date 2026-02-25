package com.naturgy.gas.controller;

import java.math.BigDecimal;

/**
 * DTO for creating a new gas reading.
 * Maps HTTP POST payload to GasReading entity.
 */
public class CreateReadingRequest {
    private String cups;
    private String fecha; // YYYY-MM-DD
    private BigDecimal lecturaM3;
    private String tipo; // REAL or ESTIMADA

    public CreateReadingRequest() {}

    public CreateReadingRequest(String cups, String fecha, BigDecimal lecturaM3, String tipo) {
        this.cups = cups;
        this.fecha = fecha;
        this.lecturaM3 = lecturaM3;
        this.tipo = tipo;
    }

    public String getCups() { return cups; }
    public void setCups(String cups) { this.cups = cups; }

    public String getFecha() { return fecha; }
    public void setFecha(String fecha) { this.fecha = fecha; }

    public BigDecimal getLecturaM3() { return lecturaM3; }
    public void setLecturaM3(BigDecimal lecturaM3) { this.lecturaM3 = lecturaM3; }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }
}
