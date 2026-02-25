package com.naturgy.gas.repository;

import com.naturgy.gas.entity.SupplyPoint;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SupplyPointRepository extends JpaRepository<SupplyPoint, String> {

    List<SupplyPoint> findByEstado(SupplyPoint.EstadoEnum estado);
}
