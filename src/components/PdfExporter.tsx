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

/** Truncate text so it fits within maxW (mm) at the current font/size. */
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
  color: string
) {
  const [cr, cg, cb] = hex(color);

  if (emp.vacant) {
    // white fill + dashed colored border
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(cr, cg, cb);
    pdf.setLineWidth(0.4);
    pdf.setLineDashPattern([1.5, 1.5], 0);
    pdf.roundedRect(x, y, w, h, 2, 2, "FD");
    pdf.setLineDashPattern([], 0);

    // "VACANT" badge
    pdf.setFillColor(cr, cg, cb);
    pdf.roundedRect(x + 2, y + 1.5, 14, 3.8, 1, 1, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(4.5);
    pdf.text("VACANT", x + 3, y + 4);

    // name in dept color
    pdf.setTextColor(cr, cg, cb);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.text(trunc(pdf, emp.name, w - 4), x + 2, y + 9);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(5.5);
    pdf.text(trunc(pdf, emp.position, w - 4), x + 2, y + 13);
    return;
  }

  // solid coloured card
  pdf.setFillColor(cr, cg, cb);
  pdf.roundedRect(x, y, w, h, 2, 2, "F");

  let ty = y + 5;

  // name
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.text(trunc(pdf, emp.name, w - 4), x + 2, ty);
  ty += 3.8;

  // position
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(5.5);
  pdf.setTextColor(230, 235, 245);
  pdf.text(trunc(pdf, emp.position, w - 4), x + 2, ty);
  ty += 3.2;

  // start date + visa
  let info = emp.startDate || "";
  if (emp.visaStatus) info += (info ? " \u00b7 " : "") + emp.visaStatus;
  if (info) {
    pdf.setFontSize(4.8);
    pdf.setTextColor(210, 220, 235);
    pdf.text(trunc(pdf, info, w - 4), x + 2, ty);
    ty += 3;
  }

  // salary
  const sal = emp.annualSalary
    ? `$${emp.annualSalary.toLocaleString()}/yr`
    : emp.hourlyRate
      ? `$${emp.hourlyRate.toFixed(2)}/hr`
      : "";
  if (sal) {
    let line = sal;
    if (emp.payFrequency) line += ` (${emp.payFrequency})`;
    pdf.setFontSize(4.8);
    pdf.setTextColor(210, 220, 235);
    pdf.text(trunc(pdf, line, w - 4), x + 2, ty);
  }
}

// ── L-shaped connector ──────────────────────────────────────────────────────

function drawL(
  pdf: any,
  x1: number,
  y1: number,
  x2: number,
  y2: number
) {
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

      const A3_W = 420;
      const A3_H = 297;
      const MARGIN = 15;
      const HEADER_H = 25;

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a3",
      });

      // ── shared header / footer helpers ──

      const drawHeader = (line1: string, line2: string) => {
        pdf.setFillColor(...hex("#1E3A5F"));
        pdf.rect(0, 0, A3_W, HEADER_H, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(16);
        pdf.text(line1, MARGIN, 12);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.text(line2, MARGIN, 20);
      };

      const drawFooter = (left?: string) => {
        pdf.setTextColor(120, 120, 120);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7);
        if (left) pdf.text(left, MARGIN, A3_H - 8);
        pdf.text("Confidential", A3_W - MARGIN, A3_H - 8, { align: "right" });
      };

      // ====================================================================
      // PAGE 1 — Organisation Chart
      // ====================================================================

      drawHeader(
        data.companyName,
        `Organisation Chart \u2014 As at ${data.asAtDate}`
      );

      // sizing constants
      const DIR_W = 68,
        DIR_H = 30;
      const MGR_W = 58,
        MGR_H = 26;
      const GAP_V = 14;
      const GAP_H = 6;

      // adaptive staff card sizing based on department count
      const deptCount = data.departments.length;
      let STAFF_W: number, MAX_PER_ROW: number, DEPT_GAP: number;
      if (deptCount <= 2) {
        STAFF_W = 50;
        MAX_PER_ROW = 4;
        DEPT_GAP = 14;
      } else if (deptCount <= 4) {
        STAFF_W = 44;
        MAX_PER_ROW = 3;
        DEPT_GAP = 10;
      } else {
        STAFF_W = 38;
        MAX_PER_ROW = 2;
        DEPT_GAP = 8;
      }
      const STAFF_H = 22;
      const STAFF_GAP = 3;
      const LABEL_H = 8;

      let curY = HEADER_H + 6;

      // ── Director ──
      let dirCX = A3_W / 2;
      if (data.director) {
        const dx = (A3_W - DIR_W) / 2;
        drawCard(pdf, dx, curY, DIR_W, DIR_H, data.director, DIRECTOR_COLOR);
        dirCX = dx + DIR_W / 2;
      }
      const dirBottomY = curY + DIR_H;
      curY = dirBottomY + GAP_V;

      // ── Managers ──
      interface MgrPos {
        cx: number;
        name: string;
      }
      const mgrPos: MgrPos[] = [];

      if (data.managers.length > 0) {
        const totalW =
          data.managers.length * MGR_W +
          (data.managers.length - 1) * GAP_H;
        let mx = (A3_W - totalW) / 2;

        for (const mgr of data.managers) {
          drawCard(pdf, mx, curY, MGR_W, MGR_H, mgr, MANAGER_COLOR);
          const cx = mx + MGR_W / 2;
          mgrPos.push({ cx, name: mgr.name });

          // director → manager line
          if (data.director) drawL(pdf, dirCX, dirBottomY, cx, curY);

          mx += MGR_W + GAP_H;
        }
      }
      const mgrBottomY = curY + MGR_H;
      curY = mgrBottomY + GAP_V;

      // ── Departments ──
      if (data.departments.length > 0) {
        // compute column widths
        const layouts: {
          dept: DepartmentGroup;
          colW: number;
          rows: Employee[][];
        }[] = [];

        for (const dept of data.departments) {
          const rows: Employee[][] = [];
          for (let i = 0; i < dept.staff.length; i += MAX_PER_ROW)
            rows.push(dept.staff.slice(i, i + MAX_PER_ROW));
          const cols = Math.min(dept.staff.length || 1, MAX_PER_ROW);
          const colW = cols * (STAFF_W + STAFF_GAP) - STAFF_GAP;
          layouts.push({ dept, colW: Math.max(colW, 30), rows });
        }

        const totalDeptW =
          layouts.reduce((s, l) => s + l.colW, 0) +
          (layouts.length - 1) * DEPT_GAP;
        let deptX = Math.max(MARGIN, (A3_W - totalDeptW) / 2);

        const labelY = curY;
        const staffStartY = labelY + LABEL_H + 8;

        for (const { dept, colW, rows } of layouts) {
          const cx = deptX + colW / 2;

          // pill label
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(6.5);
          const lw = Math.max(pdf.getTextWidth(dept.name) + 10, 22);
          const lx = cx - lw / 2;
          pdf.setFillColor(...hex(dept.color));
          pdf.roundedRect(lx, labelY, lw, LABEL_H, 4, 4, "F");
          pdf.setTextColor(255, 255, 255);
          pdf.text(dept.name, cx, labelY + 5.5, { align: "center" });

          // manager → label line
          if (dept.manager) {
            const mp = mgrPos.find((m) => m.name === dept.manager!.name);
            if (mp) drawL(pdf, mp.cx, mgrBottomY, cx, labelY);
          }

          // staff cards
          let sy = staffStartY;
          for (const row of rows) {
            const rowW = row.length * (STAFF_W + STAFF_GAP) - STAFF_GAP;
            let sx = cx - rowW / 2;
            for (const emp of row) {
              drawCard(pdf, sx, sy, STAFF_W, STAFF_H, emp, dept.color);
              drawL(pdf, cx, labelY + LABEL_H, sx + STAFF_W / 2, sy);
              sx += STAFF_W + STAFF_GAP;
            }
            sy += STAFF_H + STAFF_GAP;
          }

          deptX += colW + DEPT_GAP;
        }
      }

      drawFooter(
        `Total Employees: ${data.totalEmployees}  |  Total Annual Payroll: $${data.totalAnnualPayroll.toLocaleString()}`
      );

      // ====================================================================
      // PAGE 2 — Salary Table
      // ====================================================================

      pdf.addPage("a3", "landscape");
      drawHeader(
        data.companyName,
        `Employee Salary Details \u2014 As at ${data.asAtDate}`
      );

      const cols = [
        { label: "Department", w: 42 },
        { label: "Employee", w: 55 },
        { label: "Position", w: 55 },
        { label: "Start Date", w: 34 },
        { label: "Visa Status", w: 34 },
        { label: "Pay Frequency", w: 34 },
        { label: "Hourly Rate", w: 34, right: true },
        { label: "Annual Salary", w: 42, right: true },
        { label: "Monthly Salary", w: 42, right: true },
      ];
      const TW = cols.reduce((s, c) => s + c.w, 0);
      const TX = MARGIN + (A3_W - 2 * MARGIN - TW) / 2;
      const RH = 6.5;
      let ty = HEADER_H + 8;

      // header row
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

      // data groups
      const groups: { name: string; employees: Employee[] }[] = [];
      const mgmt = [
        ...(data.director ? [data.director] : []),
        ...data.managers,
      ];
      if (mgmt.length) groups.push({ name: "Management", employees: mgmt });
      for (const d of data.departments)
        if (d.staff.length) groups.push({ name: d.name, employees: d.staff });

      let grandMonthly = 0;

      for (const group of groups) {
        let subAnnual = 0;
        let subMonthly = 0;

        for (let i = 0; i < group.employees.length; i++) {
          const e = group.employees[i];
          subAnnual += e.annualSalary || 0;
          subMonthly += e.monthlySalary || 0;

          // alternating row bg
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
              { align: col.right ? "right" : "left" }
            );
            if (c === 0 && i === 0) pdf.setFont("helvetica", "normal");
            cx += col.w;
          }
          ty += RH;
        }
        grandMonthly += subMonthly;

        // subtotal row
        pdf.setFillColor(229, 231, 235);
        pdf.rect(TX, ty, TW, RH, "F");
        pdf.setTextColor(55, 65, 81);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(6);
        pdf.text(
          `Subtotal \u2014 ${group.name} (${group.employees.length} employees)`,
          TX + 2,
          ty + 4.2
        );
        const annColX =
          TX + cols.slice(0, 7).reduce((s, c) => s + c.w, 0);
        pdf.text(
          `$${subAnnual.toLocaleString()}`,
          annColX + cols[7].w - 2,
          ty + 4.2,
          { align: "right" }
        );
        pdf.text(
          `$${subMonthly.toLocaleString()}`,
          annColX + cols[7].w + cols[8].w - 2,
          ty + 4.2,
          { align: "right" }
        );
        ty += RH;
      }

      // grand total
      pdf.setFillColor(...hex("#1E3A5F"));
      pdf.rect(TX, ty, TW, RH + 1, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(6.5);
      pdf.text(
        `GRAND TOTAL (${data.totalEmployees} employees)`,
        TX + 2,
        ty + 4.5
      );
      const gAnnX = TX + cols.slice(0, 7).reduce((s, c) => s + c.w, 0);
      pdf.text(
        `$${data.totalAnnualPayroll.toLocaleString()}`,
        gAnnX + cols[7].w - 2,
        ty + 4.5,
        { align: "right" }
      );
      pdf.text(
        `$${grandMonthly.toLocaleString()}`,
        gAnnX + cols[7].w + cols[8].w - 2,
        ty + 4.5,
        { align: "right" }
      );

      drawFooter();

      // save
      const fn = `${data.companyName.replace(/\s+/g, "_")}_OrgChart_${data.asAtDate.replace(/\s+/g, "_")}.pdf`;
      pdf.save(fn);
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
