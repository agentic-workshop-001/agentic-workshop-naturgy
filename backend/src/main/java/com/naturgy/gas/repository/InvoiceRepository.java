package com.naturgy.gas.repository;

import com.naturgy.gas.entity.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Optional;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    Optional<Invoice> findByCupsAndPeriodoInicio(String cups, LocalDate periodoInicio);

    boolean existsByNumeroFactura(String numeroFactura);

    long countByPeriodoInicio(LocalDate periodoInicio);

    @Query("SELECT i FROM Invoice i LEFT JOIN FETCH i.lines WHERE i.id = :id")
    Optional<Invoice> findWithLinesById(@Param("id") Long id);
}
