package com.naturgy.gas.repository;

import com.naturgy.gas.entity.GasReading;
import com.naturgy.gas.entity.GasReading.GasReadingId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GasReadingRepository extends JpaRepository<GasReading, GasReadingId> {
}
