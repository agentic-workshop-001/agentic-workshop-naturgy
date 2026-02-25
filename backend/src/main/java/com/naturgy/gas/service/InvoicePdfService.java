package com.naturgy.gas.service;

import com.naturgy.gas.entity.Invoice;
import com.naturgy.gas.entity.InvoiceLine;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

/**
 * Generates a simple single-page PDF invoice using PDFBox 3.x.
 */
@Service
public class InvoicePdfService {

    public byte[] generatePdf(Invoice invoice) {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);

            PDType1Font fontBold    = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            PDType1Font fontRegular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);

            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                float margin = 50f;
                float pageWidth = page.getMediaBox().getWidth();
                float y = page.getMediaBox().getHeight() - margin;

                // --- Header ---
                cs.beginText();
                cs.setFont(fontBold, 16);
                cs.newLineAtOffset(margin, y);
                cs.showText("FACTURA GAS");
                cs.endText();
                y -= 20;

                cs.beginText();
                cs.setFont(fontRegular, 10);
                cs.newLineAtOffset(margin, y);
                cs.showText("N. Factura: " + invoice.getNumeroFactura());
                cs.endText();
                y -= 14;

                cs.beginText();
                cs.setFont(fontRegular, 10);
                cs.newLineAtOffset(margin, y);
                cs.showText("CUPS: " + invoice.getCups());
                cs.endText();
                y -= 14;

                cs.beginText();
                cs.setFont(fontRegular, 10);
                cs.newLineAtOffset(margin, y);
                cs.showText("Periodo: " + invoice.getPeriodoInicio() + " / " + invoice.getPeriodoFin());
                cs.endText();
                y -= 14;

                cs.beginText();
                cs.setFont(fontRegular, 10);
                cs.newLineAtOffset(margin, y);
                cs.showText("Fecha emision: " + invoice.getFechaEmision());
                cs.endText();
                y -= 24;

                // --- Lines header ---
                drawLine(cs, margin, pageWidth - margin, y);
                y -= 14;

                cs.beginText();
                cs.setFont(fontBold, 10);
                cs.newLineAtOffset(margin, y);
                cs.showText(String.format("%-25s %10s %14s %12s", "Concepto", "Cantidad", "Precio unit.", "Importe"));
                cs.endText();
                y -= 12;
                drawLine(cs, margin, pageWidth - margin, y);
                y -= 14;

                // --- Invoice lines ---
                for (InvoiceLine line : invoice.getLines()) {
                    String desc = safe(line.getDescripcion());
                    String qty  = line.getCantidad().toPlainString();
                    String preu = line.getPrecioUnitario().toPlainString();
                    String imp  = line.getImporte().toPlainString();

                    cs.beginText();
                    cs.setFont(fontRegular, 9);
                    cs.newLineAtOffset(margin, y);
                    cs.showText(String.format("%-25s %10s %14s %12s", trunc(desc, 25), trunc(qty, 10), trunc(preu, 14), trunc(imp, 12)));
                    cs.endText();
                    y -= 14;
                }

                y -= 10;
                drawLine(cs, margin, pageWidth - margin, y);
                y -= 16;

                // --- Totals ---
                printTotalRow(cs, fontBold, fontRegular, margin, y, "Base imponible:", invoice.getBase().toPlainString());
                y -= 14;
                printTotalRow(cs, fontBold, fontRegular, margin, y, "IVA:", invoice.getImpuestos().toPlainString());
                y -= 14;
                printTotalRow(cs, fontBold, fontBold, margin, y, "TOTAL:", invoice.getTotal().toPlainString() + " EUR");
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            doc.save(baos);
            return baos.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Error generating PDF for invoice " + invoice.getNumeroFactura(), e);
        }
    }

    private void drawLine(PDPageContentStream cs, float x1, float x2, float y) throws IOException {
        cs.moveTo(x1, y);
        cs.lineTo(x2, y);
        cs.stroke();
    }

    private void printTotalRow(PDPageContentStream cs, PDType1Font labelFont, PDType1Font valueFont,
                                float margin, float y, String label, String value) throws IOException {
        cs.beginText();
        cs.setFont(labelFont, 10);
        cs.newLineAtOffset(margin + 250, y);
        cs.showText(label);
        cs.endText();

        cs.beginText();
        cs.setFont(valueFont, 10);
        cs.newLineAtOffset(margin + 380, y);
        cs.showText(value);
        cs.endText();
    }

    /** Replace non-Latin-1 chars to avoid PDFBox Type1 font encoding issues. */
    private String safe(String s) {
        if (s == null) return "";
        return s.replace("\u00e9", "e")  // é -> e
                .replace("\u00f3", "o")  // ó -> o
                .replace("\u00ed", "i")  // í -> i
                .replace("\u00fa", "u")  // ú -> u
                .replace("\u00e1", "a")  // á -> a
                .replace("\u00f1", "n"); // ñ -> n
    }

    private String trunc(String s, int max) {
        if (s == null) return "";
        return s.length() > max ? s.substring(0, max) : s;
    }
}
