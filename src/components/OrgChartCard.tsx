"use client";

import { Employee } from "@/lib/types";

interface OrgChartCardProps {
  employee: Employee;
  color: string;
  compact?: boolean;
}

export default function OrgChartCard({
  employee,
  color,
  compact = false,
}: OrgChartCardProps) {
  const salary = employee.annualSalary
    ? `$${employee.annualSalary.toLocaleString()}/yr`
    : employee.hourlyRate
      ? `$${employee.hourlyRate.toFixed(2)}/hr`
      : "";

  return (
    <div
      className={`rounded-lg border bg-white shadow-sm overflow-hidden ${compact ? "min-w-[160px]" : "min-w-[200px]"}`}
      style={{ borderTopColor: color, borderTopWidth: "3px" }}
    >
      <div className={compact ? "px-3 py-2" : "px-4 py-3"}>
        <p
          className={`font-bold text-gray-900 ${compact ? "text-xs" : "text-sm"}`}
        >
          {employee.name}
        </p>
        <p
          className={`text-gray-600 ${compact ? "text-[10px]" : "text-xs"}`}
        >
          {employee.position}
        </p>
        {!compact && (
          <>
            <div className="mt-1 flex items-center gap-1 text-[10px] text-gray-500">
              {employee.startDate && <span>{employee.startDate}</span>}
              {employee.startDate && employee.visaStatus && <span>|</span>}
              {employee.visaStatus && <span>{employee.visaStatus}</span>}
            </div>
            {salary && (
              <div className="mt-0.5 text-[10px] text-gray-500">
                {salary}
                {employee.payFrequency && ` (${employee.payFrequency})`}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
