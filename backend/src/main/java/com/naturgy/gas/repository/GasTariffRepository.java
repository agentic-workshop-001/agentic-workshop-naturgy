package com.naturgy.gas.repository;

import com.naturgy.gas.entity.GasTariff;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.Optional;

public interface GasTariffRepository extends JpaRepository<GasTariff, Long> {

    boolean existsByTarifaAndVigenciaDesde(String tarifa, LocalDate vigenciaDesde);

    @Query(value = "SELECT * FROM gas_tariff WHERE tarifa = :tarifa AND vigencia_desde <= :periodEnd " +
           "ORDER BY vigencia_desde DESC LIMIT 1", nativeQuery = true)
    Optional<GasTariff> findActiveForPeriod(@Param("tarifa") String tarifa,
                                             @Param("periodEnd") LocalDate periodEnd);
}
