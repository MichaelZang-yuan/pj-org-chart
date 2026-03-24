"use client";

import { useCallback, useState } from "react";
import {
  OrgData,
  Employee,
  DepartmentGroup,
  DIRECTOR_COLOR,
  MANAGER_COLOR,
} from "@/lib/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface PdfExporterProps {
  data: OrgData;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function hex(c: string): [number, number, number] {
  const h = c.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function trunc(pdf: any, text: string, maxW: number): string {
  if (!text) return "";
  if (pdf.getTextWidth(text) <= maxW) return text;
  while (text.length > 1 && pdf.getTextWidth(text + "\u2026") > maxW)
    text = text.slice(0, -1);
  return text + "\u2026";
}

// ── card drawing ─────────────────────────────────────────────────────────────

function drawCard(
  pdf: any,
  x: number,
  y: number,
  w: number,
  h: number,
  emp: Employee,
  color: string,
) {
  const [cr, cg, cb] = hex(color);
  const PAD = 3;

  if (emp.vacant) {
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(cr, cg, cb);
    pdf.setLineWidth(0.5);
    pdf.setLineDashPattern([1.5, 1.5], 0);
    pdf.roundedRect(x, y, w, h, 2.5, 2.5, "FD");
    pdf.setLineDashPattern([], 0);

    pdf.setFillColor(cr, cg, cb);
    pdf.roundedRect(x + PAD, y + 2, 16, 4.5, 1, 1, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(5.5);
    pdf.text("VACANT", x + PAD + 1, y + 5);

    pdf.setTextColor(cr, cg, cb);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text(trunc(pdf, emp.name, w - PAD * 2), x + PAD, y + 12);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.text(trunc(pdf, emp.position, w - PAD * 2), x + PAD, y + 17);
    return;
  }

  pdf.setFillColor(cr, cg, cb);
  pdf.roundedRect(x, y, w, h, 2.5, 2.5, "F");

  let ty = y + 6.5;

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text(trunc(pdf, emp.name, w - PAD * 2), x + PAD, ty);
  ty += 5;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(230, 235, 245);
  pdf.text(trunc(pdf, emp.position, w - PAD * 2), x + PAD, ty);
  ty += 4.5;

  let info = emp.startDate || "";
  if (emp.visaStatus) info += (info ? " \u00b7 " : "") + emp.visaStatus;
  if (info) {
    pdf.setFontSize(7);
    pdf.setTextColor(210, 220, 235);
    pdf.text(trunc(pdf, info, w - PAD * 2), x + PAD, ty);
    ty += 4;
  }

  const sal = emp.annualSalary
    ? `$${emp.annualSalary.toLocaleString()}/yr`
    : emp.hourlyRate
      ? `$${emp.hourlyRate.toFixed(2)}/hr`
      : "";
  if (sal) {
    let line = sal;
    if (emp.payFrequency) line += ` (${emp.payFrequency})`;
    pdf.setFontSize(7);
    pdf.setTextColor(210, 220, 235);
    pdf.text(trunc(pdf, line, w - PAD * 2), x + PAD, ty);
  }
}

function drawL(pdf: any, x1: number, y1: number, x2: number, y2: number) {
  const midY = y1 + (y2 - y1) / 2;
  pdf.setDrawColor(148, 163, 184);
  pdf.setLineWidth(0.35);
  pdf.setLineDashPattern([], 0);
  pdf.line(x1, y1, x1, midY);
  pdf.line(x1, midY, x2, midY);
  pdf.line(x2, midY, x2, y2);
}

// ── main component ──────────────────────────────────────────────────────────

export default function PdfExporter({ data }: PdfExporterProps) {
  const [exporting, setExporting] = useState(false);

  const exportPdf = useCallback(async () => {
    setExporting(true);
    try {
      const { jsPDF } = await import("jspdf");

      // ── constants ──
      const MARGIN = 20;
      const HEADER_H = 25;
      const FOOTER_H = 14;
      const DIR_W = 82, DIR_H = 38;
      const MGR_W = 72, MGR_H = 34;
      const STAFF_W = 62, STAFF_H = 30;
      const GAP_V = 18;
      const GAP_H = 10;
      const STAFF_GAP_H = 6;
      const STAFF_GAP_V = 6;
      const LABEL_H = 12;
      const LABEL_TO_STAFF = 12;
      const MAX_PER_ROW = 3;
      const DEPT_GAP = 16;

      // ══════════════════════════════════════════════════════════════════
      // STEP 1: Calculate the exact content size needed
      // ══════════════════════════════════════════════════════════════════

      // Temp PDF just for measuring text widths
      const tmp = new jsPDF({ unit: "mm", orientation: "l", format: "a4" });

      // --- Measure each department column ---
      interface DeptLayout {
        dept: DepartmentGroup;
        labelW: number;
        colW: number;
        rows: Employee[][];
        colH: number;
      }
      const deptLayouts: DeptLayout[] = [];

      for (const dept of data.departments) {
        // Label pill width: measure text then add padding
        tmp.setFont("helvetica", "bold");
        tmp.setFontSize(8.5);
        const labelW = tmp.getTextWidth(dept.name) + 18;

        // Split staff into rows of MAX_PER_ROW
        const rows: Employee[][] = [];
        for (let i = 0; i < dept.staff.length; i += MAX_PER_ROW) {
          rows.push(dept.staff.slice(i, i + MAX_PER_ROW));
        }

        // Column width = max(label, widest staff row)
        const staffRowW = Math.min(dept.staff.length, MAX_PER_ROW) * (STAFF_W + STAFF_GAP_H) - STAFF_GAP_H;
        const colW = Math.max(labelW, staffRowW, STAFF_W);

        // Column height = label + gap + staff rows
        const staffTotalH = rows.length > 0
          ? rows.length * STAFF_H + (rows.length - 1) * STAFF_GAP_V
          : 0;
        const colH = LABEL_H + LABEL_TO_STAFF + staffTotalH;

        deptLayouts.push({ dept, labelW, colW, rows, colH });
      }

      // --- Width of each level ---
      const dirRowW = DIR_W;
      const mgrRowW = data.managers.length > 0
        ? data.managers.length * MGR_W + (data.managers.length - 1) * GAP_H
        : 0;
      const deptRowW = deptLayouts.length > 0
        ? deptLayouts.reduce((s, d) => s + d.colW, 0) + (deptLayouts.length - 1) * DEPT_GAP
        : 0;

      const maxContentW = Math.max(dirRowW, mgrRowW, deptRowW);

      // --- Height of content ---
      const maxDeptColH = deptLayouts.length > 0
        ? Math.max(...deptLayouts.map((d) => d.colH))
        : 0;
      let contentH = 0;
      if (data.director) contentH += DIR_H + GAP_V;
      if (data.managers.length > 0) contentH += MGR_H + GAP_V;
      if (deptLayouts.length > 0) contentH += maxDeptColH;

      // --- Final page dimensions (minimum A3 landscape = 420×297) ---
      const PAGE_W = Math.max(420, maxContentW + MARGIN * 2);
      const PAGE_H = Math.max(297, HEADER_H + 10 + contentH + 10 + FOOTER_H);

      console.log(`[PDF] Page 1 size: ${PAGE_W.toFixed(0)}×${PAGE_H.toFixed(0)}mm`);
      console.log(`[PDF] Content widths — Dir: ${dirRowW}, Mgr: ${mgrRowW.toFixed(0)}, Dept: ${deptRowW.toFixed(0)}`);
      console.log(`[PDF] Content height: ${contentH.toFixed(0)}mm, Dept col heights:`, deptLayouts.map(d => `${d.dept.name}=${d.colH.toFixed(0)}`));

      // ══════════════════════════════════════════════════════════════════
      // STEP 2: Create PDF and draw Page 1 — Org Chart
      // ══════════════════════════════════════════════════════════════════

      // CRITICAL: orientation "l" (landscape) ensures PAGE_W is the page width
      const pdf = new jsPDF({ unit: "mm", orientation: "l", format: [PAGE_H, PAGE_W] });

      // Header
      pdf.setFillColor(...hex("#1E3A5F"));
      pdf.rect(0, 0, PAGE_W, HEADER_H, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.text(data.companyName, MARGIN, 12);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text(`Organisation Chart \u2014 As at ${data.asAtDate}`, MARGIN, 20);

      let curY = HEADER_H + 10;
      let drawnCount = 0;

      // ── Director ──
      let dirCX = PAGE_W / 2;
      if (data.director) {
        const dx = (PAGE_W - DIR_W) / 2;
        drawCard(pdf, dx, curY, DIR_W, DIR_H, data.director, DIRECTOR_COLOR);
        dirCX = dx + DIR_W / 2;
        drawnCount++;
        console.log(`[PDF] Drew director: ${data.director.name} at x=${dx.toFixed(0)}`);
      }
      const dirBottomY = curY + DIR_H;
      curY = dirBottomY + GAP_V;

      // ── Managers ──
      interface MgrPos { cx: number; name: string }
      const mgrPos: MgrPos[] = [];

      if (data.managers.length > 0) {
        const startX = (PAGE_W - mgrRowW) / 2;
        let mx = startX;

        for (let i = 0; i < data.managers.length; i++) {
          const mgr = data.managers[i];
          drawCard(pdf, mx, curY, MGR_W, MGR_H, mgr, MANAGER_COLOR);
          const cx = mx + MGR_W / 2;
          mgrPos.push({ cx, name: mgr.name });
          drawnCount++;
          console.log(`[PDF] Drew manager ${i + 1}/${data.managers.length}: ${mgr.name} at x=${mx.toFixed(0)}`);

          // Director → Manager line
          if (data.director) drawL(pdf, dirCX, dirBottomY, cx, curY);

          mx += MGR_W + GAP_H;
        }
      }
      const mgrBottomY = curY + MGR_H;
      curY = mgrBottomY + GAP_V;

      // ── Departments ──
      if (deptLayouts.length > 0) {
        const startX = (PAGE_W - deptRowW) / 2;
        let deptX = startX;
        const labelY = curY;
        const staffStartY = labelY + LABEL_H + LABEL_TO_STAFF;

        for (let di = 0; di < deptLayouts.length; di++) {
          const { dept, labelW, colW, rows } = deptLayouts[di];
          const cx = deptX + colW / 2;

          // Pill label — never truncated
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(8.5);
          const lx = cx - labelW / 2;
          pdf.setFillColor(...hex(dept.color));
          pdf.roundedRect(lx, labelY, labelW, LABEL_H, 5, 5, "F");
          pdf.setTextColor(255, 255, 255);
          pdf.text(dept.name, cx, labelY + 8, { align: "center" });
          console.log(`[PDF] Drew dept label: "${dept.name}" at x=${lx.toFixed(0)}, labelW=${labelW.toFixed(0)}`);

          // Manager → Dept label line
          if (dept.manager) {
            const mp = mgrPos.find((p) => p.name === dept.manager!.name);
            if (mp) drawL(pdf, mp.cx, mgrBottomY, cx, labelY);
          }

          // Staff cards — iterate every single employee
          let sy = staffStartY;
          for (let ri = 0; ri < rows.length; ri++) {
            const row = rows[ri];
            const rowW = row.length * (STAFF_W + STAFF_GAP_H) - STAFF_GAP_H;
            let sx = cx - rowW / 2;

            for (let si = 0; si < row.length; si++) {
              const emp = row[si];
              drawCard(pdf, sx, sy, STAFF_W, STAFF_H, emp, dept.color);
              drawL(pdf, cx, labelY + LABEL_H, sx + STAFF_W / 2, sy);
              drawnCount++;
              console.log(`[PDF] Drew staff: ${emp.name} (${dept.name}) at x=${sx.toFixed(0)}, y=${sy.toFixed(0)}`);
              sx += STAFF_W + STAFF_GAP_H;
            }
            sy += STAFF_H + STAFF_GAP_V;
          }

          deptX += colW + DEPT_GAP;
        }
      }

      console.log(`[PDF] Page 1 done. Drew ${drawnCount} employee cards. Expected: ${data.totalEmployees}`);

      // Footer
      pdf.setTextColor(120, 120, 120);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.text(
        `Total Employees: ${data.totalEmployees}  |  Total Annual Payroll: $${data.totalAnnualPayroll.toLocaleString()}`,
        MARGIN,
        PAGE_H - 8,
      );
      pdf.text("Confidential", PAGE_W - MARGIN, PAGE_H - 8, { align: "right" });

      // ══════════════════════════════════════════════════════════════════
      // STEP 3: Page 2 — Salary Table (same width as page 1)
      // ══════════════════════════════════════════════════════════════════

      // Table column definitions — widths scaled to fit PAGE_W
      const colDefs = [
        { label: "Department", base: 42 },
        { label: "Employee", base: 55 },
        { label: "Position", base: 55 },
        { label: "Start Date", base: 34 },
        { label: "Visa Status", base: 34 },
        { label: "Pay Frequency", base: 34 },
        { label: "Hourly Rate", base: 34, right: true as const },
        { label: "Annual Salary", base: 42, right: true as const },
        { label: "Monthly Salary", base: 42, right: true as const },
      ];
      const baseTotal = colDefs.reduce((s, c) => s + c.base, 0); // 372
      const availableW = PAGE_W - MARGIN * 2;
      const scale = Math.max(1, availableW / baseTotal); // scale up if page is wider; never scale down
      const cols = colDefs.map((c) => ({
        label: c.label,
        w: c.base * Math.min(scale, 1.5), // cap at 1.5x to avoid overly wide columns
        right: "right" in c ? c.right : (false as const),
      }));
      const TW = cols.reduce((s, c) => s + c.w, 0);

      // Compute table page height
      let totalTableRows = 0;
      const groups: { name: string; employees: Employee[] }[] = [];
      const mgmt = [
        ...(data.director ? [data.director] : []),
        ...data.managers,
      ];
      if (mgmt.length) groups.push({ name: "Management", employees: mgmt });
      for (const d of data.departments)
        if (d.staff.length) groups.push({ name: d.name, employees: d.staff });
      for (const g of groups) totalTableRows += g.employees.length + 1; // +1 for subtotal
      totalTableRows += 1; // header row
      totalTableRows += 1; // grand total row

      const RH = 6.5;
      const tableContentH = HEADER_H + 10 + totalTableRows * (RH + 0.15) + FOOTER_H + 10;
      const T_H = Math.max(297, tableContentH);

      // CRITICAL: orientation "l" so PAGE_W is the width
      pdf.addPage([T_H, PAGE_W], "l");
      console.log(`[PDF] Page 2 size: ${PAGE_W.toFixed(0)}×${T_H.toFixed(0)}mm, table width: ${TW.toFixed(0)}mm`);

      // Header
      pdf.setFillColor(...hex("#1E3A5F"));
      pdf.rect(0, 0, PAGE_W, HEADER_H, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.text(data.companyName, MARGIN, 12);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text(`Employee Salary Details \u2014 As at ${data.asAtDate}`, MARGIN, 20);

      const TX = MARGIN + (availableW - TW) / 2; // center table
      let ty = HEADER_H + 10;

      // Table header row
      pdf.setFillColor(...hex("#1E3A5F"));
      pdf.rect(TX, ty, TW, RH + 1, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(6.5);
      let cx = TX;
      for (const c of cols) {
        pdf.text(c.label, c.right ? cx + c.w - 2 : cx + 2, ty + 4.5, {
          align: c.right ? "right" : "left",
        });
        cx += c.w;
      }
      ty += RH + 1;

      // Data rows
      let grandMonthly = 0;

      for (const group of groups) {
        let subAnnual = 0;
        let subMonthly = 0;

        for (let i = 0; i < group.employees.length; i++) {
          const e = group.employees[i];
          subAnnual += e.annualSalary || 0;
          subMonthly += e.monthlySalary || 0;

          if (i % 2 === 1) {
            pdf.setFillColor(248, 250, 252);
            pdf.rect(TX, ty, TW, RH, "F");
          }

          pdf.setTextColor(55, 65, 81);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(6);

          const vals = [
            i === 0 ? group.name : "",
            e.name + (e.vacant ? " [Vacant]" : ""),
            e.position,
            e.startDate || "",
            e.visaStatus || "",
            e.payFrequency || "",
            e.hourlyRate ? `$${e.hourlyRate.toFixed(2)}` : "-",
            e.annualSalary ? `$${e.annualSalary.toLocaleString()}` : "-",
            e.monthlySalary ? `$${e.monthlySalary.toLocaleString()}` : "-",
          ];

          cx = TX;
          for (let c = 0; c < cols.length; c++) {
            const col = cols[c];
            if (c === 0 && i === 0) pdf.setFont("helvetica", "bold");
            pdf.text(
              trunc(pdf, vals[c], col.w - 4),
              col.right ? cx + col.w - 2 : cx + 2,
              ty + 4.2,
              { align: col.right ? "right" : "left" },
            );
            if (c === 0 && i === 0) pdf.setFont("helvetica", "normal");
            cx += col.w;
          }
          ty += RH;
        }
        grandMonthly += subMonthly;

        // Subtotal row
        pdf.setFillColor(229, 231, 235);
        pdf.rect(TX, ty, TW, RH, "F");
        pdf.setTextColor(55, 65, 81);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(6);
        pdf.text(
          `Subtotal \u2014 ${group.name} (${group.employees.length} employees)`,
          TX + 2,
          ty + 4.2,
        );
        const annColX = TX + cols.slice(0, 7).reduce((s, c) => s + c.w, 0);
        pdf.text(`$${subAnnual.toLocaleString()}`, annColX + cols[7].w - 2, ty + 4.2, { align: "right" });
        pdf.text(`$${subMonthly.toLocaleString()}`, annColX + cols[7].w + cols[8].w - 2, ty + 4.2, { align: "right" });
        ty += RH;
      }

      // Grand total row
      pdf.setFillColor(...hex("#1E3A5F"));
      pdf.rect(TX, ty, TW, RH + 1, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(6.5);
      pdf.text(`GRAND TOTAL (${data.totalEmployees} employees)`, TX + 2, ty + 4.5);
      const gAnnX = TX + cols.slice(0, 7).reduce((s, c) => s + c.w, 0);
      pdf.text(`$${data.totalAnnualPayroll.toLocaleString()}`, gAnnX + cols[7].w - 2, ty + 4.5, { align: "right" });
      pdf.text(`$${grandMonthly.toLocaleString()}`, gAnnX + cols[7].w + cols[8].w - 2, ty + 4.5, { align: "right" });

      // Footer
      pdf.setTextColor(120, 120, 120);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.text("Confidential", PAGE_W - MARGIN, T_H - 8, { align: "right" });

      // Save
      const fn = `${data.companyName.replace(/\s+/g, "_")}_OrgChart_${data.asAtDate.replace(/\s+/g, "_")}.pdf`;
      pdf.save(fn);
      console.log(`[PDF] Saved: ${fn}`);
    } catch (err) {
      console.error("PDF export failed:", err);
      console.error("Details:", {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      alert("Failed to export PDF. Check console (F12) for details.");
    } finally {
      setExporting(false);
    }
  }, [data]);

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
