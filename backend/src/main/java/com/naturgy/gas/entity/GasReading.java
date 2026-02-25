package com.naturgy.gas.entity;

import jakarta.persistence.*;
import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Objects;

@Entity
@Table(name = "gas_reading",
       uniqueConstraints = @UniqueConstraint(columnNames = {"cups", "fecha"}))
public class GasReading {

    @EmbeddedId
    private GasReadingId id;

    @Column(name = "lectura_m3", nullable = false, precision = 12, scale = 3)
    private BigDecimal lecturaM3;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo", nullable = false)
    private TipoEnum tipo;

    public enum TipoEnum { REAL, ESTIMADA }

    @Embeddable
    public static class GasReadingId implements Serializable {
        @Column(name = "cups", nullable = false)
        private String cups;

        @Column(name = "fecha", nullable = false)
        private LocalDate fecha;

        public GasReadingId() {}

        public GasReadingId(String cups, LocalDate fecha) {
            this.cups = cups;
            this.fecha = fecha;
        }

        public String getCups() { return cups; }
        public void setCups(String cups) { this.cups = cups; }
        public LocalDate getFecha() { return fecha; }
        public void setFecha(LocalDate fecha) { this.fecha = fecha; }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof GasReadingId)) return false;
            GasReadingId that = (GasReadingId) o;
            return Objects.equals(cups, that.cups) && Objects.equals(fecha, that.fecha);
        }

        @Override
        public int hashCode() { return Objects.hash(cups, fecha); }
    }

    public GasReading() {}

    public GasReading(String cups, LocalDate fecha, BigDecimal lecturaM3, TipoEnum tipo) {
        this.id = new GasReadingId(cups, fecha);
        this.lecturaM3 = lecturaM3;
        this.tipo = tipo;
    }

    public GasReadingId getId() { return id; }
    public void setId(GasReadingId id) { this.id = id; }
    public BigDecimal getLecturaM3() { return lecturaM3; }
    public void setLecturaM3(BigDecimal lecturaM3) { this.lecturaM3 = lecturaM3; }
    public TipoEnum getTipo() { return tipo; }
    public void setTipo(TipoEnum tipo) { this.tipo = tipo; }

    public String getCups() { return id != null ? id.getCups() : null; }
    public LocalDate getFecha() { return id != null ? id.getFecha() : null; }
}
