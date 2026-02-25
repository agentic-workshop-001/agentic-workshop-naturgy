package com.naturgy.gas.repository;

import com.naturgy.gas.entity.TaxConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.Optional;

public interface TaxConfigRepository extends JpaRepository<TaxConfig, Long> {

    boolean existsByTaxCodeAndVigenciaDesde(String taxCode, LocalDate vigenciaDesde);

    @Query("SELECT t FROM TaxConfig t WHERE t.taxCode = :taxCode AND t.vigenciaDesde <= :periodEnd " +
           "ORDER BY t.vigenciaDesde DESC LIMIT 1")
    Optional<TaxConfig> findActiveForPeriod(@Param("taxCode") String taxCode,
                                             @Param("periodEnd") LocalDate periodEnd);
}
