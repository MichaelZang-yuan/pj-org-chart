"use client";

import { useCallback, useState } from "react";
import { OrgData } from "@/lib/types";

interface PdfExporterProps {
  data: OrgData;
  chartRef: React.RefObject<HTMLDivElement | null>;
  tableRef: React.RefObject<HTMLDivElement | null>;
}

export default function PdfExporter({
  data,
  chartRef,
  tableRef,
}: PdfExporterProps) {
  const [exporting, setExporting] = useState(false);

  const exportPdf = useCallback(async () => {
    if (!chartRef.current || !tableRef.current) {
      console.error("PDF export failed: chart or table DOM element not found");
      return;
    }
    setExporting(true);

    try {
      // Dynamic imports to avoid SSR issues
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      // A3 landscape dimensions in mm
      const A3_W = 420;
      const A3_H = 297;
      const MARGIN = 15;
      const HEADER_H = 25;
      const FOOTER_H = 20;

      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });

      // --- Page 1: Org Chart ---
      pdf.setFillColor(30, 58, 95);
      pdf.rect(0, 0, A3_W, HEADER_H, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16);
      pdf.text(data.companyName, MARGIN, 12);
      pdf.setFontSize(10);
      pdf.text(`Organisation Chart — As at ${data.asAtDate}`, MARGIN, 20);

      console.log("Capturing org chart...");
      const chartCanvas = await html2canvas(chartRef.current, {
        scale: 2,
        backgroundColor: "#F8FAFC",
        useCORS: true,
        logging: false,
        allowTaint: true,
        windowWidth: chartRef.current.scrollWidth,
        windowHeight: chartRef.current.scrollHeight,
      });
      console.log("Org chart captured:", chartCanvas.width, "x", chartCanvas.height);

      const chartImg = chartCanvas.toDataURL("image/png");
      const contentW = A3_W - MARGIN * 2;
      const contentH = A3_H - HEADER_H - FOOTER_H - MARGIN;
      const chartAspect = chartCanvas.width / chartCanvas.height;
      let imgW = contentW;
      let imgH = imgW / chartAspect;
      if (imgH > contentH) {
        imgH = contentH;
        imgW = imgH * chartAspect;
      }
      const imgX = MARGIN + (contentW - imgW) / 2;
      pdf.addImage(chartImg, "PNG", imgX, HEADER_H + 5, imgW, imgH);

      // Footer
      pdf.setTextColor(100, 100, 100);
      pdf.setFontSize(8);
      pdf.text(
        `Total Employees: ${data.totalEmployees}  |  Total Annual Payroll: $${data.totalAnnualPayroll.toLocaleString()}`,
        MARGIN,
        A3_H - FOOTER_H + 5
      );
      pdf.text("Confidential", A3_W - MARGIN - 25, A3_H - FOOTER_H + 5);

      // --- Page 2: Salary Table ---
      pdf.addPage("a3", "landscape");

      pdf.setFillColor(30, 58, 95);
      pdf.rect(0, 0, A3_W, HEADER_H, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16);
      pdf.text(data.companyName, MARGIN, 12);
      pdf.setFontSize(10);
      pdf.text(`Employee Salary Details — As at ${data.asAtDate}`, MARGIN, 20);

      console.log("Capturing salary table...");
      const tableCanvas = await html2canvas(tableRef.current, {
        scale: 2,
        backgroundColor: "#FFFFFF",
        useCORS: true,
        logging: false,
        allowTaint: true,
        windowWidth: tableRef.current.scrollWidth,
        windowHeight: tableRef.current.scrollHeight,
      });
      console.log("Salary table captured:", tableCanvas.width, "x", tableCanvas.height);

      const tableImg = tableCanvas.toDataURL("image/png");
      const tableAspect = tableCanvas.width / tableCanvas.height;
      let tW = contentW;
      let tH = tW / tableAspect;
      if (tH > contentH) {
        tH = contentH;
        tW = tH * tableAspect;
      }
      const tX = MARGIN + (contentW - tW) / 2;
      pdf.addImage(tableImg, "PNG", tX, HEADER_H + 5, tW, tH);

      // Footer
      pdf.setTextColor(100, 100, 100);
      pdf.setFontSize(8);
      pdf.text("Confidential", A3_W - MARGIN - 25, A3_H - FOOTER_H + 5);

      // Save
      const filename = `${data.companyName.replace(/\s+/g, "_")}_OrgChart_${data.asAtDate.replace(/\s+/g, "_")}.pdf`;
      pdf.save(filename);
      console.log("PDF saved:", filename);
    } catch (err) {
      console.error("PDF export failed:", err);
      console.error("Error details:", {
        name: err instanceof Error ? err.name : "Unknown",
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      alert("Failed to export PDF. Check browser console (F12) for details.");
    } finally {
      setExporting(false);
    }
  }, [data, chartRef, tableRef]);

  return (
    <button
      onClick={exportPdf}
      disabled={exporting}
      className={`
        inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white shadow-md
        transition-all duration-200
        ${exporting ? "bg-gray-400 cursor-wait" : "bg-[#1E3A5F] hover:bg-[#2a5080] active:scale-95"}
      `}
    >
      {exporting ? (
        <>
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Generating PDF...
        </>
      ) : (
        <>
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          Download PDF
        </>
      )}
    </button>
  );
}
