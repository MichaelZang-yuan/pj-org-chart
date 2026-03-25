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
      console.error("[PDF] chart or table ref not found");
      return;
    }
    setExporting(true);

    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const MARGIN = 15;
      const HEADER_H = 25;
      const FOOTER_H = 15;
      const MIN_W = 420; // at least A3 landscape width

      // ── Helper: temporarily expand element for full capture ──
      function expandForCapture(el: HTMLElement) {
        const saved = {
          overflow: el.style.overflow,
          width: el.style.width,
          maxWidth: el.style.maxWidth,
          position: el.style.position,
        };
        el.style.overflow = "visible";
        el.style.width = "auto";
        el.style.maxWidth = "none";
        el.style.position = "relative";
        return saved;
      }
      function restoreStyle(el: HTMLElement, saved: Record<string, string>) {
        el.style.overflow = saved.overflow;
        el.style.width = saved.width;
        el.style.maxWidth = saved.maxWidth;
        el.style.position = saved.position;
      }

      // ── Capture chart ──
      console.log("[PDF] Capturing org chart...");
      const chartEl = chartRef.current;
      const chartSaved = expandForCapture(chartEl);
      // Force layout recalc
      const chartW = chartEl.scrollWidth;
      const chartH = chartEl.scrollHeight;
      console.log(`[PDF] Chart scroll size: ${chartW}x${chartH}`);

      const chartCanvas = await html2canvas(chartEl, {
        scale: 2,
        backgroundColor: "#F8FAFC",
        useCORS: true,
        logging: false,
        width: chartW,
        height: chartH,
        windowWidth: chartW,
        windowHeight: chartH,
      });
      restoreStyle(chartEl, chartSaved);
      console.log("[PDF] Chart captured:", chartCanvas.width, "x", chartCanvas.height);

      // ── Capture table ──
      console.log("[PDF] Capturing salary table...");
      const tableEl = tableRef.current;
      const tableSaved = expandForCapture(tableEl);
      const tableW = tableEl.scrollWidth;
      const tableH = tableEl.scrollHeight;
      console.log(`[PDF] Table scroll size: ${tableW}x${tableH}`);

      const tableCanvas = await html2canvas(tableEl, {
        scale: 2,
        backgroundColor: "#FFFFFF",
        useCORS: true,
        logging: false,
        width: tableW,
        height: tableH,
        windowWidth: tableW,
        windowHeight: tableH,
      });
      restoreStyle(tableEl, tableSaved);
      console.log("[PDF] Table captured:", tableCanvas.width, "x", tableCanvas.height);

      // ── Determine page size dynamically from captured content ──
      // Convert captured pixels to mm: chartCanvas is at scale=2, so real px = canvas/2
      // We'll fit the content to the page, using the aspect ratio

      const chartAspect = chartCanvas.width / chartCanvas.height;
      const tableAspect = tableCanvas.width / tableCanvas.height;

      // Page width: at least MIN_W, but wider if content is very wide relative to height
      const contentW = MIN_W - MARGIN * 2;

      // Chart page: fit chart to contentW, compute height
      const chartImgW = contentW;
      const chartImgH = chartImgW / chartAspect;
      const page1W = MIN_W;
      const page1H = Math.max(297, HEADER_H + 5 + chartImgH + 5 + FOOTER_H);

      // Table page: fit table to contentW, compute height
      const tableImgW = contentW;
      const tableImgH = tableImgW / tableAspect;
      const page2W = MIN_W;
      const page2H = Math.max(297, HEADER_H + 5 + tableImgH + 5 + FOOTER_H);

      console.log(`[PDF] Page 1: ${page1W}x${page1H.toFixed(0)}mm, chart img: ${chartImgW.toFixed(0)}x${chartImgH.toFixed(0)}mm`);
      console.log(`[PDF] Page 2: ${page2W}x${page2H.toFixed(0)}mm, table img: ${tableImgW.toFixed(0)}x${tableImgH.toFixed(0)}mm`);

      // ── Create PDF ──
      const pdf = new jsPDF({
        unit: "mm",
        orientation: "l",
        format: [page1H, page1W],
      });

      // ── Page 1: Org Chart ──
      pdf.setFillColor(30, 58, 95);
      pdf.rect(0, 0, page1W, HEADER_H, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.text(data.companyName, MARGIN, 12);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text(`Organisation Chart \u2014 As at ${data.asAtDate}`, MARGIN, 20);

      const chartImg = chartCanvas.toDataURL("image/png");
      const chartX = MARGIN + (contentW - chartImgW) / 2;
      pdf.addImage(chartImg, "PNG", chartX, HEADER_H + 5, chartImgW, chartImgH);

      pdf.setTextColor(100, 100, 100);
      pdf.setFontSize(8);
      pdf.text(
        `Total Employees: ${data.totalEmployees}  |  Total Annual Payroll: $${data.totalAnnualPayroll.toLocaleString()}`,
        MARGIN,
        page1H - 8,
      );
      pdf.text("Confidential", page1W - MARGIN, page1H - 8, { align: "right" });

      // ── Page 2: Salary Table ──
      pdf.addPage([page2H, page2W], "l");

      pdf.setFillColor(30, 58, 95);
      pdf.rect(0, 0, page2W, HEADER_H, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.text(data.companyName, MARGIN, 12);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text(`Employee Salary Details \u2014 As at ${data.asAtDate}`, MARGIN, 20);

      const tableImg = tableCanvas.toDataURL("image/png");
      const tableX = MARGIN + (contentW - tableImgW) / 2;
      pdf.addImage(tableImg, "PNG", tableX, HEADER_H + 5, tableImgW, tableImgH);

      pdf.setTextColor(100, 100, 100);
      pdf.setFontSize(8);
      pdf.text("Confidential", page2W - MARGIN, page2H - 8, { align: "right" });

      // Save
      const filename = `${data.companyName.replace(/\s+/g, "_")}_OrgChart_${data.asAtDate.replace(/\s+/g, "_")}.pdf`;
      pdf.save(filename);
      console.log("[PDF] Saved:", filename);
    } catch (err) {
      console.error("[PDF] Export failed:", err);
      console.error("Details:", {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      alert("Failed to export PDF. Check console (F12) for details.");
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
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Generating PDF...
        </>
      ) : (
        <>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download PDF
        </>
      )}
    </button>
  );
}
