"use client";

import {
  OrgData,
  Employee,
  DepartmentGroup,
  DIRECTOR_COLOR,
  MANAGER_COLOR,
} from "@/lib/types";

/*
 * Pure CSS org chart tree.
 * Uses <ul>/<li> + CSS border lines. No SVG, no refs, no JS coordinates.
 * Lines are drawn with ::before / ::after on <li> elements.
 * html2canvas captures these perfectly because they are normal DOM/CSS.
 *
 * Technique: each <li> in a row draws:
 *   ::before  — horizontal line on the left half  (border-bottom)
 *   ::after   — horizontal line on the right half (border-bottom)
 *   first-child  hides ::before  (no line to the left)
 *   last-child   hides ::after   (no line to the right)
 *   only-child   hides both (just vertical stem)
 *
 * The vertical stem (parent ↓ child) is a border-left on a zero-width
 * div sitting between the card and the horizontal bar.
 */

// ── styles (CSS-in-JS, inline) ──────────────────────────────────────────────

const LINE_COLOR = "#94A3B8";
const LINE_W = 2;
const STEM_H = 20;

// ── Card ─────────────────────────────────────────────────────────────────────

function Card({ emp, color }: { emp: Employee; color: string }) {
  const v = emp.vacant;
  const sal = emp.annualSalary
    ? `$${emp.annualSalary.toLocaleString()}/yr`
    : emp.hourlyRate
      ? `$${emp.hourlyRate.toFixed(2)}/hr`
      : "";

  return (
    <div
      className="rounded-xl overflow-hidden shadow-md"
      style={{
        backgroundColor: v ? "transparent" : color,
        border: v ? `2px dashed ${color}` : "none",
        minWidth: 200,
        maxWidth: 260,
        display: "inline-block",
      }}
    >
      <div style={{ padding: "12px 16px" }}>
        {v && (
          <span
            style={{
              display: "inline-block",
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
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
        <p style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.3, color: v ? color : "#fff" }}>
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

// ── Dept label pill ──────────────────────────────────────────────────────────

function DeptPill({ dept }: { dept: DepartmentGroup }) {
  return (
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
      }}
    >
      {dept.name}
    </div>
  );
}

// ── Tree node wrapper ────────────────────────────────────────────────────────
// Wraps a card (or any content) and optionally draws children below it
// with pure CSS connector lines.

function TreeNode({
  children,
  childNodes,
}: {
  children: React.ReactNode; // the card / label
  childNodes?: React.ReactNode[]; // child TreeNodes
}) {
  const hasChildren = childNodes && childNodes.length > 0;

  return (
    <li
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        position: "relative",
        padding: `0 ${hasChildren ? 8 : 6}px`,
        listStyle: "none",
      }}
    >
      {/* The card / label itself */}
      {children}

      {/* Children branch */}
      {hasChildren && (
        <>
          {/* Vertical stem DOWN from this node to the horizontal bar */}
          <div
            style={{
              width: 0,
              height: STEM_H,
              borderLeft: `${LINE_W}px solid ${LINE_COLOR}`,
            }}
          />

          {/* Children row */}
          <ul
            style={{
              display: "flex",
              justifyContent: "center",
              padding: 0,
              margin: 0,
              listStyle: "none",
              position: "relative",
            }}
          >
            {childNodes!.map((child, i) => {
              const count = childNodes!.length;
              const isFirst = i === 0;
              const isLast = i === count - 1;
              const isOnly = count === 1;

              return (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    position: "relative",
                    padding: "0 8px",
                    listStyle: "none",
                  }}
                >
                  {/* Horizontal connector bar across siblings */}
                  {/* Each <li> draws its portion of the horizontal line at the top */}
                  {!isOnly && (
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: isFirst ? "50%" : 0,
                        right: isLast ? "50%" : 0,
                        height: 0,
                        borderTop: `${LINE_W}px solid ${LINE_COLOR}`,
                      }}
                    />
                  )}

                  {/* Vertical stem UP from horizontal bar to this child */}
                  <div
                    style={{
                      width: 0,
                      height: STEM_H,
                      borderLeft: `${LINE_W}px solid ${LINE_COLOR}`,
                    }}
                  />

                  {/* The child content */}
                  {child}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </li>
  );
}

// ── Main OrgChart ───────────────────────────────────────────────────────────

export default function OrgChart({ data }: { data: OrgData }) {
  // Build manager → departments mapping
  const mgrToDepts = new Map<string, DepartmentGroup[]>();
  for (const dept of data.departments) {
    if (dept.manager) {
      const arr = mgrToDepts.get(dept.manager.name) || [];
      arr.push(dept);
      mgrToDepts.set(dept.manager.name, arr);
    }
  }
  const assignedDeptNames = new Set(
    data.departments.filter((d) => d.manager).map((d) => d.name)
  );
  const unassignedDepts = data.departments.filter(
    (d) => !assignedDeptNames.has(d.name)
  );

  // Build staff sub-trees for a department
  function buildStaffChildren(dept: DepartmentGroup) {
    if (dept.staff.length === 0) return undefined;
    // Chunk staff into rows of 4 max to avoid excessive width
    const MAX = 4;
    if (dept.staff.length <= MAX) {
      return dept.staff.map((e) => (
        <TreeNode key={e.name}>
          <Card emp={e} color={dept.color} />
        </TreeNode>
      ));
    }
    // More than MAX: show first row as fan-out, remaining as grid rows below
    // We'll just use a simple grid wrapped in a single child node
    return [
      <li
        key="grid"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          listStyle: "none",
          padding: "0 8px",
          position: "relative",
        }}
      >
        {/* Vertical stem */}
        <div
          style={{
            width: 0,
            height: STEM_H,
            borderLeft: `${LINE_W}px solid ${LINE_COLOR}`,
          }}
        />
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 12,
            maxWidth: MAX * 272,
          }}
        >
          {dept.staff.map((e) => (
            <Card key={e.name} emp={e} color={dept.color} />
          ))}
        </div>
      </li>,
    ];
  }

  // Build department sub-trees for a manager
  function buildDeptChildren(mgr: Employee) {
    const depts = mgrToDepts.get(mgr.name);
    if (!depts || depts.length === 0) return undefined;
    return depts.map((dept) => (
      <TreeNode key={dept.name} childNodes={buildStaffChildren(dept)}>
        <DeptPill dept={dept} />
      </TreeNode>
    ));
  }

  // Build manager sub-trees
  const managerChildren =
    data.managers.length > 0
      ? data.managers.map((mgr) => (
          <TreeNode key={mgr.name} childNodes={buildDeptChildren(mgr)}>
            <Card emp={mgr} color={MANAGER_COLOR} />
          </TreeNode>
        ))
      : undefined;

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <ul
        style={{
          display: "flex",
          justifyContent: "center",
          padding: 0,
          margin: 0,
          listStyle: "none",
        }}
      >
        {/* Root: Director */}
        {data.director ? (
          <TreeNode childNodes={managerChildren}>
            <Card emp={data.director} color={DIRECTOR_COLOR} />
          </TreeNode>
        ) : (
          // No director — show managers as top level
          managerChildren
        )}
      </ul>

      {/* Unassigned departments (not under any manager) */}
      {unassignedDepts.length > 0 && (
        <div
          style={{
            marginTop: 32,
            display: "flex",
            justifyContent: "center",
            gap: 40,
            flexWrap: "wrap",
          }}
        >
          {unassignedDepts.map((dept) => (
            <ul
              key={dept.name}
              style={{
                display: "flex",
                justifyContent: "center",
                padding: 0,
                margin: 0,
                listStyle: "none",
              }}
            >
              <TreeNode childNodes={buildStaffChildren(dept)}>
                <DeptPill dept={dept} />
              </TreeNode>
            </ul>
          ))}
        </div>
      )}
    </div>
  );
}
