"use client";

import React from "react";
import {
  OrgData,
  Employee,
  DepartmentGroup,
  DIRECTOR_COLOR,
  MANAGER_COLOR,
} from "@/lib/types";

const LINE = "#94A3B8";
const STEM = 20; // px, vertical stem between levels

// ── Employee Card ────────────────────────────────────────────────────────────

function Card({ employee, color }: { employee: Employee; color: string }) {
  const v = employee.vacant;
  const sal = employee.annualSalary
    ? `$${employee.annualSalary.toLocaleString()}/yr`
    : employee.hourlyRate
      ? `$${employee.hourlyRate.toFixed(2)}/hr`
      : "";

  return (
    <div
      className="rounded-xl overflow-hidden shadow-md"
      style={{
        backgroundColor: v ? "transparent" : color,
        border: v ? `2px dashed ${color}` : "none",
        minWidth: 220,
        maxWidth: 280,
      }}
    >
      <div className="px-4 py-3.5">
        {v && (
          <span
            className="inline-block text-[10px] font-bold uppercase tracking-wider rounded px-2 py-0.5 mb-1.5"
            style={{ backgroundColor: color, color: "#fff", opacity: 0.8 }}
          >
            Vacant
          </span>
        )}
        <p className="font-bold leading-snug" style={{ color: v ? color : "#fff", fontSize: 16 }}>
          {employee.name}
        </p>
        <p className="mt-0.5 leading-snug" style={{ color: v ? color : "rgba(255,255,255,0.85)", fontSize: 14 }}>
          {employee.position}
        </p>
        {employee.startDate && (
          <p className="mt-1.5 leading-snug" style={{ color: v ? "#6B7280" : "rgba(255,255,255,0.7)", fontSize: 12 }}>
            {employee.startDate}
            {employee.visaStatus ? ` · ${employee.visaStatus}` : ""}
          </p>
        )}
        {sal && (
          <p className="mt-0.5 leading-snug" style={{ color: v ? "#6B7280" : "rgba(255,255,255,0.7)", fontSize: 12 }}>
            {sal}
            {employee.payFrequency ? ` (${employee.payFrequency})` : ""}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Vertical stem (a thin line between levels) ──────────────────────────────

function Stem({ h = STEM }: { h?: number }) {
  return <div style={{ width: 0, height: h, borderLeft: `1.5px solid ${LINE}`, flexShrink: 0 }} />;
}

// ── FanOut: parent → horizontal bar → children ──────────────────────────────
// Draws: vertical stem ↓ → horizontal connector ─ → vertical drops ↓ → children
// Uses real divs (no pseudo-elements) so html2canvas captures them correctly.

function FanOut({
  items,
  gap = 16,
  stemH = STEM,
}: {
  items: React.ReactNode[];
  gap?: number;
  stemH?: number;
}) {
  const n = items.length;
  if (n === 0) return null;

  if (n === 1) {
    return (
      <div className="flex flex-col items-center">
        <Stem h={stemH} />
        {items[0]}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      {/* Vertical stem from parent down to horizontal bar */}
      <Stem h={stemH} />

      {/* Children row with horizontal connector */}
      <div className="flex">
        {items.map((child, i) => (
          <div
            key={i}
            className="flex flex-col items-center"
            style={{ position: "relative", padding: `0 ${gap}px` }}
          >
            {/* Horizontal line segment at top of this cell */}
            {/* first child: right half only; last child: left half only; middle: full */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: i === 0 ? "50%" : 0,
                right: i === n - 1 ? "50%" : 0,
                height: 0,
                borderTop: `1.5px solid ${LINE}`,
              }}
            />
            {/* Vertical drop from horizontal bar to child */}
            <Stem h={stemH} />
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── StaffGrid: department label → vertical stem → grid of cards ─────────────
// For departments with multiple staff, shows them in a grid (max 3 per row)
// with a single vertical connector from the label.

function StaffGrid({
  staff,
  color,
  maxPerRow = 3,
}: {
  staff: Employee[];
  color: string;
  maxPerRow?: number;
}) {
  if (staff.length === 0) return null;

  // If 3 or fewer, use FanOut for nice horizontal connector
  if (staff.length <= maxPerRow) {
    return (
      <FanOut items={staff.map((e) => <Card key={e.name} employee={e} color={color} />)} gap={8} stemH={14} />
    );
  }

  // More than maxPerRow → chunk into rows, single vertical stem
  const rows: Employee[][] = [];
  for (let i = 0; i < staff.length; i += maxPerRow) {
    rows.push(staff.slice(i, i + maxPerRow));
  }

  return (
    <div className="flex flex-col items-center">
      <Stem h={14} />
      <div className="flex flex-col items-center gap-3">
        {rows.map((row, ri) => (
          <div key={ri} className="flex justify-center gap-4">
            {row.map((emp) => (
              <Card key={emp.name} employee={emp} color={color} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Department section ──────────────────────────────────────────────────────

function DeptSection({ dept }: { dept: DepartmentGroup }) {
  return (
    <div className="flex flex-col items-center">
      {/* Department pill label */}
      <div
        className="rounded-full px-6 py-2 text-white font-bold shadow-sm tracking-wide"
        style={{ fontSize: 14, backgroundColor: dept.color }}
      >
        {dept.name}
      </div>
      {/* Staff below */}
      <StaffGrid staff={dept.staff} color={dept.color} />
    </div>
  );
}

// ── Main OrgChart ───────────────────────────────────────────────────────────

export default function OrgChart({ data }: { data: OrgData }) {
  // Map manager name → departments they oversee
  const mgrToDepts = new Map<string, DepartmentGroup[]>();
  for (const dept of data.departments) {
    if (dept.manager) {
      const arr = mgrToDepts.get(dept.manager.name) || [];
      arr.push(dept);
      mgrToDepts.set(dept.manager.name, arr);
    }
  }

  // Departments not assigned to any manager
  const assignedDeptNames = new Set(
    data.departments.filter((d) => d.manager).map((d) => d.name)
  );
  const unassignedDepts = data.departments.filter(
    (d) => !assignedDeptNames.has(d.name)
  );

  return (
    <div className="w-full flex flex-col items-center">
      {/* Director */}
      {data.director && <Card employee={data.director} color={DIRECTOR_COLOR} />}

      {/* Director → Managers fan-out */}
      {data.director && data.managers.length > 0 && (
        <FanOut
          gap={20}
          items={data.managers.map((mgr) => {
            const depts = mgrToDepts.get(mgr.name) || [];
            return (
              <div key={mgr.name} className="flex flex-col items-center">
                <Card employee={mgr} color={MANAGER_COLOR} />

                {/* Manager → Departments fan-out */}
                {depts.length > 0 && (
                  <FanOut
                    gap={16}
                    items={depts.map((dept) => (
                      <DeptSection key={dept.name} dept={dept} />
                    ))}
                  />
                )}
              </div>
            );
          })}
        />
      )}

      {/* Managers without director (edge case) */}
      {!data.director && data.managers.length > 0 && (
        <div className="flex flex-wrap justify-center gap-6">
          {data.managers.map((mgr) => (
            <div key={mgr.name} className="flex flex-col items-center">
              <Card employee={mgr} color={MANAGER_COLOR} />
              {(mgrToDepts.get(mgr.name) || []).length > 0 && (
                <FanOut
                  gap={16}
                  items={(mgrToDepts.get(mgr.name) || []).map((dept) => (
                    <DeptSection key={dept.name} dept={dept} />
                  ))}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Unassigned departments */}
      {unassignedDepts.length > 0 && (
        <div className="mt-8 flex flex-wrap justify-center gap-10">
          {unassignedDepts.map((dept) => (
            <DeptSection key={dept.name} dept={dept} />
          ))}
        </div>
      )}
    </div>
  );
}
