"use client";

import {
  OrgData,
  Employee,
  DepartmentGroup,
  DIRECTOR_COLOR,
  MANAGER_COLOR,
} from "@/lib/types";

const LINE = "#94A3B8";
const CARD_W = 200;

// ── Props ────────────────────────────────────────────────────────────────────

interface OrgChartProps {
  data: OrgData;
  editMode?: boolean;
  onCardClick?: (emp: Employee) => void;
  onCardContext?: (emp: Employee, x: number, y: number) => void;
  onDeptContext?: (dept: DepartmentGroup, x: number, y: number) => void;
  onBlankContext?: (x: number, y: number) => void;
  onAddToDept?: (deptName: string) => void;
  onAddManager?: () => void;
}

// ── Employee Card ────────────────────────────────────────────────────────────

function Card({
  emp,
  color,
  editMode,
  onClick,
  onContext,
}: {
  emp: Employee;
  color: string;
  editMode?: boolean;
  onClick?: () => void;
  onContext?: (x: number, y: number) => void;
}) {
  const v = emp.vacant;
  const sal = emp.annualSalary
    ? `$${emp.annualSalary.toLocaleString()}/yr`
    : emp.hourlyRate
      ? `$${emp.hourlyRate.toFixed(2)}/hr`
      : "";

  return (
    <div
      onClick={editMode ? onClick : undefined}
      onContextMenu={
        editMode
          ? (e) => {
              e.preventDefault();
              e.stopPropagation();
              onContext?.(e.clientX, e.clientY);
            }
          : undefined
      }
      style={{
        width: CARD_W,
        backgroundColor: v ? "transparent" : color,
        border: v ? `2px dashed ${color}` : "none",
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
        cursor: editMode ? "pointer" : "default",
        transition: "box-shadow 0.15s",
        ...(editMode ? { outline: "2px solid transparent" } : {}),
      }}
      onMouseEnter={(e) => {
        if (editMode) e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.2)";
      }}
      onMouseLeave={(e) => {
        if (editMode) e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.12)";
      }}
    >
      <div style={{ padding: "12px 14px", position: "relative" }}>
        {editMode && (
          <span style={{ position: "absolute", top: 4, right: 6, fontSize: 12, opacity: 0.6, color: v ? color : "#fff" }}>
            &#9998;
          </span>
        )}
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

// ── Add button ───────────────────────────────────────────────────────────────

function AddBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="edit-ui"
      style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        border: "2px solid #94A3B8",
        backgroundColor: "#fff",
        color: "#64748B",
        fontSize: 18,
        lineHeight: "24px",
        textAlign: "center",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "#1E3A5F";
        e.currentTarget.style.color = "#fff";
        e.currentTarget.style.borderColor = "#1E3A5F";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "#fff";
        e.currentTarget.style.color = "#64748B";
        e.currentTarget.style.borderColor = "#94A3B8";
      }}
    >
      +
    </button>
  );
}

// ── Vertical stem line ───────────────────────────────────────────────────────

function VLine({ h = 32 }: { h?: number }) {
  return (
    <div style={{ width: 1, height: h, backgroundColor: LINE, margin: "0 auto", flexShrink: 0 }} />
  );
}

// ── Horizontal connector row ─────────────────────────────────────────────────

function HRow({ children, gap = 16 }: { children: React.ReactNode[]; gap?: number }) {
  const n = children.length;
  if (n === 0) return null;
  if (n === 1) {
    return <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>{children[0]}</div>;
  }
  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      {children.map((child, i) => (
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
          <div
            style={{
              position: "absolute",
              top: 0,
              left: i === 0 ? "50%" : 0,
              right: i === n - 1 ? "50%" : 0,
              height: 0,
              borderTop: `2px solid ${LINE}`,
            }}
          />
          <div style={{ width: 1, height: 20, backgroundColor: LINE }} />
          {child}
        </div>
      ))}
    </div>
  );
}

// ── Department section ───────────────────────────────────────────────────────

function DeptSection({
  dept,
  editMode,
  onCardClick,
  onCardContext,
  onDeptContext,
  onAdd,
}: {
  dept: DepartmentGroup;
  editMode?: boolean;
  onCardClick?: (emp: Employee) => void;
  onCardContext?: (emp: Employee, x: number, y: number) => void;
  onDeptContext?: (dept: DepartmentGroup, x: number, y: number) => void;
  onAdd?: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* Pill label */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          onContextMenu={
            editMode
              ? (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDeptContext?.(dept, e.clientX, e.clientY);
                }
              : undefined
          }
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
            cursor: editMode ? "context-menu" : "default",
          }}
        >
          {dept.name}
        </div>
        {editMode && onAdd && <AddBtn onClick={onAdd} />}
      </div>

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
              <Card
                key={emp.name}
                emp={emp}
                color={dept.color}
                editMode={editMode}
                onClick={() => onCardClick?.(emp)}
                onContext={(x, y) => onCardContext?.(emp, x, y)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Main OrgChart ────────────────────────────────────────────────────────────

export default function OrgChart({
  data,
  editMode,
  onCardClick,
  onCardContext,
  onDeptContext,
  onBlankContext,
  onAddToDept,
  onAddManager,
}: OrgChartProps) {
  return (
    <div
      style={{ minWidth: 1200, overflowX: "auto" }}
      onContextMenu={
        editMode
          ? (e) => {
              // Only fire if clicking on blank area (not bubbled from card/dept)
              if (e.target === e.currentTarget || (e.target as HTMLElement).dataset?.blank) {
                e.preventDefault();
                onBlankContext?.(e.clientX, e.clientY);
              }
            }
          : undefined
      }
    >
      {/* Layer 1: Director */}
      {data.director && (
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Card
            emp={data.director}
            color={DIRECTOR_COLOR}
            editMode={editMode}
            onClick={() => onCardClick?.(data.director!)}
            onContext={(x, y) => onCardContext?.(data.director!, x, y)}
          />
        </div>
      )}

      {data.director && data.managers.length > 0 && <VLine />}

      {/* Layer 2: Managers */}
      {data.managers.length > 0 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <HRow gap={20}>
              {data.managers.map((mgr) => (
                <Card
                  key={mgr.name}
                  emp={mgr}
                  color={MANAGER_COLOR}
                  editMode={editMode}
                  onClick={() => onCardClick?.(mgr)}
                  onContext={(x, y) => onCardContext?.(mgr, x, y)}
                />
              ))}
            </HRow>
          </div>
          {editMode && onAddManager && <AddBtn onClick={onAddManager} />}
        </div>
      )}

      {data.departments.length > 0 && <VLine />}

      {/* Layer 3: Departments */}
      {data.departments.length > 0 && (
        <HRow gap={32}>
          {data.departments.map((dept) => (
            <DeptSection
              key={dept.name}
              dept={dept}
              editMode={editMode}
              onCardClick={onCardClick}
              onCardContext={onCardContext}
              onDeptContext={onDeptContext}
              onAdd={() => onAddToDept?.(dept.name)}
            />
          ))}
        </HRow>
      )}
    </div>
  );
}
