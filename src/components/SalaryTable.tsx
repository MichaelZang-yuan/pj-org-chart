"use client";

import { OrgData } from "@/lib/types";

interface SalaryTableProps {
  data: OrgData;
}

export default function SalaryTable({ data }: SalaryTableProps) {
  // Build rows: Management first, then other departments
  const allGroups: { name: string; employees: typeof data.managers }[] = [];

  // Management group (director + managers)
  const mgmtEmployees = [
    ...(data.director ? [data.director] : []),
    ...data.managers,
  ];
  if (mgmtEmployees.length > 0) {
    allGroups.push({ name: "Management", employees: mgmtEmployees });
  }

  // Department groups
  for (const dept of data.departments) {
    if (dept.staff.length > 0) {
      allGroups.push({ name: dept.name, employees: dept.staff });
    }
  }

  const grandTotal = data.totalAnnualPayroll;
  const grandMonthly = allGroups.reduce(
    (sum, g) => sum + g.employees.reduce((s, e) => s + e.monthlySalary, 0),
    0
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-[#1E3A5F] text-white">
            <th className="px-3 py-2 text-left font-semibold">Department</th>
            <th className="px-3 py-2 text-left font-semibold">Employee</th>
            <th className="px-3 py-2 text-left font-semibold">Position</th>
            <th className="px-3 py-2 text-left font-semibold">Start Date</th>
            <th className="px-3 py-2 text-left font-semibold">Visa Status</th>
            <th className="px-3 py-2 text-left font-semibold">Pay Frequency</th>
            <th className="px-3 py-2 text-right font-semibold">Hourly Rate</th>
            <th className="px-3 py-2 text-right font-semibold">Annual Salary</th>
            <th className="px-3 py-2 text-right font-semibold">Monthly Salary</th>
          </tr>
        </thead>
        <tbody>
          {allGroups.map((group) => {
            const subtotalAnnual = group.employees.reduce(
              (s, e) => s + e.annualSalary,
              0
            );
            const subtotalMonthly = group.employees.reduce(
              (s, e) => s + e.monthlySalary,
              0
            );

            return [
              ...group.employees.map((emp, idx) => (
                <tr
                  key={`${group.name}-${emp.name}-${idx}`}
                  className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  {idx === 0 ? (
                    <td
                      className="px-3 py-1.5 font-semibold text-gray-700 border-r border-gray-200"
                      rowSpan={group.employees.length}
                    >
                      {group.name}
                    </td>
                  ) : null}
                  <td className="px-3 py-1.5">{emp.name}</td>
                  <td className="px-3 py-1.5">{emp.position}</td>
                  <td className="px-3 py-1.5">{emp.startDate}</td>
                  <td className="px-3 py-1.5">{emp.visaStatus}</td>
                  <td className="px-3 py-1.5">{emp.payFrequency}</td>
                  <td className="px-3 py-1.5 text-right">
                    {emp.hourlyRate ? `$${emp.hourlyRate.toFixed(2)}` : "-"}
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    {emp.annualSalary
                      ? `$${emp.annualSalary.toLocaleString()}`
                      : "-"}
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    {emp.monthlySalary
                      ? `$${emp.monthlySalary.toLocaleString()}`
                      : "-"}
                  </td>
                </tr>
              )),
              <tr
                key={`${group.name}-subtotal`}
                className="bg-gray-200 font-semibold"
              >
                <td className="px-3 py-1.5" colSpan={7}>
                  Subtotal — {group.name} ({group.employees.length} employees)
                </td>
                <td className="px-3 py-1.5 text-right">
                  ${subtotalAnnual.toLocaleString()}
                </td>
                <td className="px-3 py-1.5 text-right">
                  ${subtotalMonthly.toLocaleString()}
                </td>
              </tr>,
            ];
          })}
          <tr className="bg-[#1E3A5F] text-white font-bold">
            <td className="px-3 py-2" colSpan={7}>
              GRAND TOTAL ({data.totalEmployees} employees)
            </td>
            <td className="px-3 py-2 text-right">
              ${grandTotal.toLocaleString()}
            </td>
            <td className="px-3 py-2 text-right">
              ${grandMonthly.toLocaleString()}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
