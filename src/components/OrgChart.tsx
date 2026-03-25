"use client";

import {
  OrgData,
  Employee,
  DepartmentGroup,
  DIRECTOR_COLOR,
  MANAGER_COLOR,
} from "@/lib/types";

/*
 * Flat 3-layer org chart with pure CSS border connector lines.
 *
 * Layer 1: Director (centered)
 * Layer 2: Managers (horizontal row, connected by horizontal bar)
 * Layer 3: Departments side-by-side (each with grid of staff cards)
 *
 * No SVG, no JS coordinates, no absolute positioning for lines.
 * All connectors are plain divs with borders — html2canvas compatible.
 */

const LINE = "#94A3B8";
const CARD_W = 200;

// ── Employee Card ────────────────────────────────────────────────────────────

function Card({ emp, color }: { emp: Employee; color: string }) {
  const v = emp.vacant;
  const sal = emp.annualSalary
    ? `$${emp.annualSalary.toLocaleString()}/yr`
    : emp.hourlyRate
      ? `$${emp.hourlyRate.toFixed(2)}/hr`
      : "";

  return (
    <div
      style={{
        width: CARD_W,
        backgroundColor: v ? "transparent" : color,
        border: v ? `2px dashed ${color}` : "none",
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
      }}
    >
      <div style={{ padding: "12px 14px" }}>
        {v && (
          <span
            style={{
              display: "inline-block",
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase" as const,
              letterSpacing: "0.05em",
              borderRadius: 4,
              padding: "2px 8px",
              marginBottom: 6,
              backgroundColor: color,
              color: "#fff",
              opacity: 0.8,
            }}
          >
            Vacant
          </span>
        )}
        <p style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.3, color: v ? color : "#fff", margin: 0 }}>
          {emp.name}
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.3, marginTop: 2, color: v ? color : "rgba(255,255,255,0.85)" }}>
          {emp.position}
        </p>
        {emp.startDate && (
          <p style={{ fontSize: 12, lineHeight: 1.3, marginTop: 6, color: v ? "#6B7280" : "rgba(255,255,255,0.7)" }}>
            {emp.startDate}
            {emp.visaStatus ? ` · ${emp.visaStatus}` : ""}
          </p>
        )}
        {sal && (
          <p style={{ fontSize: 12, lineHeight: 1.3, marginTop: 2, color: v ? "#6B7280" : "rgba(255,255,255,0.7)" }}>
            {sal}
            {emp.payFrequency ? ` (${emp.payFrequency})` : ""}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Vertical stem line ───────────────────────────────────────────────────────

function VLine({ h = 32 }: { h?: number }) {
  return (
    <div
      style={{
        width: 1,
        height: h,
        backgroundColor: LINE,
        margin: "0 auto",
        flexShrink: 0,
      }}
    />
  );
}

// ── Horizontal connector row ─────────────────────────────────────────────────
// Renders children in a flex row with a horizontal bar connecting them.
// Each child gets a vertical drop from the horizontal bar.

function HRow({
  children,
  gap = 16,
}: {
  children: React.ReactNode[];
  gap?: number;
}) {
  const n = children.length;
  if (n === 0) return null;

  if (n === 1) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        {children[0]}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      {children.map((child, i) => {
        const isFirst = i === 0;
        const isLast = i === n - 1;
        return (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              position: "relative",
              padding: `0 ${gap / 2}px`,
            }}
          >
            {/* Horizontal line segment at top */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: isFirst ? "50%" : 0,
                right: isLast ? "50%" : 0,
                height: 0,
                borderTop: `2px solid ${LINE}`,
              }}
            />
            {/* Vertical drop */}
            <div style={{ width: 1, height: 20, backgroundColor: LINE }} />
            {/* Child content */}
            {child}
          </div>
        );
      })}
    </div>
  );
}

// ── Department section ───────────────────────────────────────────────────────

function DeptSection({ dept }: { dept: DepartmentGroup }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* Pill label */}
      <div
        style={{
          display: "inline-block",
          borderRadius: 999,
          padding: "6px 20px",
          backgroundColor: dept.color,
          color: "#fff",
          fontWeight: 700,
          fontSize: 14,
          boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
          letterSpacing: "0.02em",
          whiteSpace: "nowrap",
        }}
      >
        {dept.name}
      </div>

      {/* Stem to staff grid */}
      {dept.staff.length > 0 && (
        <>
          <VLine h={16} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(2, ${CARD_W}px)`,
              gap: 10,
            }}
          >
            {dept.staff.map((emp) => (
              <Card key={emp.name} emp={emp} color={dept.color} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Main OrgChart ────────────────────────────────────────────────────────────

export default function OrgChart({ data }: { data: OrgData }) {
  return (
    <div style={{ minWidth: 1200, overflowX: "auto" }}>
      {/* ── Layer 1: Director ── */}
      {data.director && (
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Card emp={data.director} color={DIRECTOR_COLOR} />
        </div>
      )}

      {/* ── Stem: Director → Managers ── */}
      {data.director && data.managers.length > 0 && <VLine />}

      {/* ── Layer 2: Managers (horizontal bar + row) ── */}
      {data.managers.length > 0 && (
        <HRow gap={20}>
          {data.managers.map((mgr) => (
            <Card key={mgr.name} emp={mgr} color={MANAGER_COLOR} />
          ))}
        </HRow>
      )}

      {/* ── Stem: Managers → Departments ── */}
      {data.departments.length > 0 && <VLine />}

      {/* ── Layer 3: Departments (horizontal bar + row) ── */}
      {data.departments.length > 0 && (
        <HRow gap={32}>
          {data.departments.map((dept) => (
            <DeptSection key={dept.name} dept={dept} />
          ))}
        </HRow>
      )}
    </div>
  );
}
