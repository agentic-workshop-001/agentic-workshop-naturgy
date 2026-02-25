package com.naturgy.gas.repository;

import com.naturgy.gas.entity.GasTariff;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.Optional;

public interface GasTariffRepository extends JpaRepository<GasTariff, Long> {

    boolean existsByTarifaAndVigenciaDesde(String tarifa, LocalDate vigenciaDesde);

    @Query("SELECT t FROM GasTariff t WHERE t.tarifa = :tarifa AND t.vigenciaDesde <= :periodEnd " +
           "ORDER BY t.vigenciaDesde DESC LIMIT 1")
    Optional<GasTariff> findActiveForPeriod(@Param("tarifa") String tarifa,
                                             @Param("periodEnd") LocalDate periodEnd);
}
