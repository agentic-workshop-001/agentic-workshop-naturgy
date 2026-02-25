package com.naturgy.gas.repository;

import com.naturgy.gas.entity.SupplyPoint;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SupplyPointRepository extends JpaRepository<SupplyPoint, String> {
}
