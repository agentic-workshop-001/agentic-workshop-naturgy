package com.naturgy.gas.repository;

import com.naturgy.gas.entity.GasConversionFactor;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface GasConversionFactorRepository extends JpaRepository<GasConversionFactor, Long> {

    boolean existsByZonaAndMes(String zona, String mes);

    Optional<GasConversionFactor> findByZonaAndMes(String zona, String mes);
}
