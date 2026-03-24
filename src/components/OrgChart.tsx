"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { OrgData, Employee, DepartmentGroup, DIRECTOR_COLOR, MANAGER_COLOR } from "@/lib/types";

interface OrgChartProps {
  data: OrgData;
}

interface Pos {
  x: number;
  y: number;
}

function EmployeeCard({
  employee,
  color,
  refCallback,
}: {
  employee: Employee;
  color: string;
  refCallback?: (el: HTMLDivElement | null) => void;
}) {
  const isVacant = employee.vacant;
  const salary = employee.annualSalary
    ? `$${employee.annualSalary.toLocaleString()}/yr`
    : employee.hourlyRate
      ? `$${employee.hourlyRate.toFixed(2)}/hr`
      : "";

  return (
    <div
      ref={refCallback}
      className="rounded-lg overflow-hidden shadow-md"
      style={{
        backgroundColor: isVacant ? "transparent" : color,
        border: isVacant ? `2px dashed ${color}` : "none",
        minWidth: 180,
        maxWidth: 220,
      }}
    >
      <div className="px-3 py-2.5">
        {isVacant && (
          <span
            className="inline-block text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 mb-1"
            style={{ backgroundColor: color, color: "#fff", opacity: 0.8 }}
          >
            Vacant
          </span>
        )}
        <p
          className="font-bold text-sm leading-tight"
          style={{ color: isVacant ? color : "#fff" }}
        >
          {employee.name}
        </p>
        <p
          className="text-xs mt-0.5 leading-tight"
          style={{ color: isVacant ? color : "rgba(255,255,255,0.85)" }}
        >
          {employee.position}
        </p>
        {employee.startDate && (
          <p
            className="text-[10px] mt-1 leading-tight"
            style={{ color: isVacant ? "#6B7280" : "rgba(255,255,255,0.7)" }}
          >
            {employee.startDate}
            {employee.visaStatus ? ` · ${employee.visaStatus}` : ""}
          </p>
        )}
        {salary && (
          <p
            className="text-[10px] mt-0.5 leading-tight"
            style={{ color: isVacant ? "#6B7280" : "rgba(255,255,255,0.7)" }}
          >
            {salary}
            {employee.payFrequency ? ` (${employee.payFrequency})` : ""}
          </p>
        )}
      </div>
    </div>
  );
}

export default function OrgChart({ data }: OrgChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<string[]>([]);

  // Refs for SVG line drawing
  const directorRef = useRef<HTMLDivElement>(null);
  const managerRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const deptLabelRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const staffRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const setRef = useCallback(
    (map: React.MutableRefObject<Map<string, HTMLDivElement>>, key: string) =>
      (el: HTMLDivElement | null) => {
        if (el) map.current.set(key, el);
        else map.current.delete(key);
      },
    []
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!containerRef.current) return;
      const cRect = containerRef.current.getBoundingClientRect();
      const paths: string[] = [];

      const rel = (el: HTMLElement): DOMRect => {
        const r = el.getBoundingClientRect();
        return new DOMRect(
          r.left - cRect.left,
          r.top - cRect.top,
          r.width,
          r.height
        );
      };

      const bottomCenter = (r: DOMRect): Pos => ({
        x: r.x + r.width / 2,
        y: r.y + r.height,
      });
      const topCenter = (r: DOMRect): Pos => ({
        x: r.x + r.width / 2,
        y: r.y,
      });

      // L-shape: vertical down from parent, horizontal, vertical down to child
      const lPath = (from: Pos, to: Pos): string => {
        const midY = from.y + (to.y - from.y) / 2;
        return `M ${from.x} ${from.y} L ${from.x} ${midY} L ${to.x} ${midY} L ${to.x} ${to.y}`;
      };

      // Director → Managers
      if (directorRef.current && managerRefs.current.size > 0) {
        const dRect = rel(directorRef.current);
        const from = bottomCenter(dRect);
        managerRefs.current.forEach((el) => {
          const to = topCenter(rel(el));
          paths.push(lPath(from, to));
        });
      }

      // Build manager→department mapping from actual department manager data
      const managerDeptMap = new Map<string, string[]>();
      for (const dept of data.departments) {
        if (dept.manager) {
          const existing = managerDeptMap.get(dept.manager.name) || [];
          existing.push(dept.name);
          managerDeptMap.set(dept.manager.name, existing);
        }
      }

      // Managers → Department labels
      for (const [mgrName, deptNames] of managerDeptMap) {
        const mgrEl = managerRefs.current.get(mgrName);
        if (!mgrEl) continue;
        const from = bottomCenter(rel(mgrEl));
        for (const deptName of deptNames) {
          const deptEl = deptLabelRefs.current.get(deptName);
          if (!deptEl) continue;
          const to = topCenter(rel(deptEl));
          paths.push(lPath(from, to));
        }
      }

      // Department labels → Staff cards
      for (const dept of data.departments) {
        const deptEl = deptLabelRefs.current.get(dept.name);
        if (!deptEl) continue;
        const from = bottomCenter(rel(deptEl));
        for (const emp of dept.staff) {
          const staffEl = staffRefs.current.get(`${dept.name}-${emp.name}`);
          if (!staffEl) continue;
          const to = topCenter(rel(staffEl));
          paths.push(lPath(from, to));
        }
      }

      setLines(paths);
    }, 150);

    return () => clearTimeout(timer);
  }, [data]);

  // Identify managers not assigned to any department
  const assignedManagerNames = new Set<string>();
  for (const dept of data.departments) {
    if (dept.manager) assignedManagerNames.add(dept.manager.name);
  }
  const unassignedManagers = data.managers.filter(
    (m) => !assignedManagerNames.has(m.name)
  );

  return (
    <div ref={containerRef} className="relative w-full" style={{ minHeight: 400 }}>
      {/* SVG lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
        {lines.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke="#94A3B8"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        ))}
      </svg>

      {/* Content layers */}
      <div className="relative flex flex-col items-center gap-10" style={{ zIndex: 1 }}>
        {/* Level 0: Director */}
        {data.director && (
          <div className="flex justify-center">
            <EmployeeCard
              employee={data.director}
              color={DIRECTOR_COLOR}
              refCallback={(el) => {
                (directorRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
              }}
            />
          </div>
        )}

        {/* Level 1: Managers */}
        {data.managers.length > 0 && (
          <div className="flex flex-wrap justify-center gap-5">
            {data.managers.map((mgr) => (
              <EmployeeCard
                key={mgr.name}
                employee={mgr}
                color={MANAGER_COLOR}
                refCallback={setRef(managerRefs, mgr.name)}
              />
            ))}
          </div>
        )}

        {/* Level 2: Departments */}
        {data.departments.length > 0 && (
          <div className="flex flex-wrap justify-center gap-10 items-start">
            {data.departments.map((dept) => (
              <div key={dept.name} className="flex flex-col items-center gap-4">
                {/* Department label */}
                <div
                  ref={setRef(deptLabelRefs, dept.name) as unknown as React.Ref<HTMLDivElement>}
                  className="rounded-full px-5 py-1.5 text-white font-bold text-xs shadow-sm tracking-wide"
                  style={{ backgroundColor: dept.color }}
                >
                  {dept.name}
                </div>

                {/* Staff grid */}
                <div className="flex flex-wrap justify-center gap-3" style={{ maxWidth: 480 }}>
                  {dept.staff.map((emp) => (
                    <EmployeeCard
                      key={emp.name}
                      employee={emp}
                      color={dept.color}
                      refCallback={setRef(staffRefs, `${dept.name}-${emp.name}`)}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Unassigned managers (functional) */}
            {unassignedManagers.length > 0 && (
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-full px-5 py-1.5 bg-gray-500 text-white font-bold text-xs shadow-sm tracking-wide">
                  Functional
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  {unassignedManagers.map((mgr) => (
                    <EmployeeCard
                      key={mgr.name}
                      employee={mgr}
                      color="#6B7280"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
