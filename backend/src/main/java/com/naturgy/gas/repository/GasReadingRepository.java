package com.naturgy.gas.repository;

import com.naturgy.gas.entity.GasReading;
import com.naturgy.gas.entity.GasReading.GasReadingId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface GasReadingRepository extends JpaRepository<GasReading, GasReadingId> {

    List<GasReading> findByIdCupsOrderByIdFechaAsc(String cups);

    @Query("SELECT r FROM GasReading r WHERE r.id.cups = :cups AND r.id.fecha < :date " +
           "ORDER BY r.id.fecha DESC LIMIT 1")
    Optional<GasReading> findLastBefore(@Param("cups") String cups, @Param("date") LocalDate date);

    @Query("SELECT r FROM GasReading r WHERE r.id.cups = :cups AND r.id.fecha <= :date " +
           "ORDER BY r.id.fecha DESC LIMIT 1")
    Optional<GasReading> findLastOnOrBefore(@Param("cups") String cups, @Param("date") LocalDate date);
}
