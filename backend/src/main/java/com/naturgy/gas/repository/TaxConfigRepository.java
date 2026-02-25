package com.naturgy.gas.repository;

import com.naturgy.gas.entity.TaxConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.Optional;

public interface TaxConfigRepository extends JpaRepository<TaxConfig, Long> {

    boolean existsByTaxCodeAndVigenciaDesde(String taxCode, LocalDate vigenciaDesde);

    @Query(value = "SELECT * FROM tax_config WHERE tax_code = :taxCode AND vigencia_desde <= :periodEnd " +
           "ORDER BY vigencia_desde DESC LIMIT 1", nativeQuery = true)
    Optional<TaxConfig> findActiveForPeriod(@Param("taxCode") String taxCode,
                                             @Param("periodEnd") LocalDate periodEnd);
}
