"use client";

import { useRef } from "react";
import FileUploader from "@/components/FileUploader";
import OrgChart from "@/components/OrgChart";
import SalaryTable from "@/components/SalaryTable";
import PdfExporter from "@/components/PdfExporter";
import ChatDialog from "@/components/ChatDialog";
import { useOrgData } from "@/hooks/useOrgData";

export default function Home() {
  const { orgData, setOrgData, error, loading, processFile, reset } = useOrgData();
  const chartRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // Upload page
  if (!orgData) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#F8FAFC] px-4">
        <div className="w-full max-w-xl">
          {/* Logo/Title */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-[#1E3A5F]">
              PJ Org Chart Generator
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Upload an Excel employee spreadsheet to generate an organisation
              chart with PDF export
            </p>
          </div>

          {/* Upload area */}
          <FileUploader onFile={processFile} loading={loading} />

          {/* Error */}
          {error && (
            <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Instructions */}
          <div className="mt-8 rounded-lg bg-white border border-gray-200 px-6 py-5">
            <h2 className="text-sm font-semibold text-gray-700">
              Expected Excel Format
            </h2>
            <ul className="mt-2 space-y-1 text-xs text-gray-500">
              <li>Row 1: Company name</li>
              <li>Row 2: Date (e.g. &quot;As at 10 March 2026&quot;)</li>
              <li>
                Row 4: Headers — Employee | Start Date | Position | Visa Status
                | Pay Frequency | Hourly Rate | Annual Salary | Monthly Salary
              </li>
              <li>Row 6+: Department labels and employee data rows</li>
            </ul>
          </div>
        </div>
      </main>
    );
  }

  // Preview page
  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      {/* Top bar */}
      <div className="sticky top-0 z-50 flex items-center justify-between border-b bg-white px-6 py-3 shadow-sm">
        <div>
          <h1 className="text-lg font-bold text-[#1E3A5F]">
            {orgData.companyName}
          </h1>
          <p className="text-xs text-gray-500">
            As at {orgData.asAtDate} &middot; {orgData.totalEmployees} employees
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PdfExporter data={orgData} chartRef={chartRef} tableRef={tableRef} />
          <button
            onClick={reset}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Re-upload
          </button>
        </div>
      </div>

      {/* Org Chart section */}
      <section className="px-6 py-8">
        <h2 className="mb-4 text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Organisation Chart
        </h2>
        <div
          ref={chartRef}
          className="rounded-xl bg-[#F8FAFC] border border-gray-200 p-8"
        >
          <OrgChart data={orgData} />
        </div>
      </section>

      {/* Salary Table section */}
      <section className="px-6 pb-8">
        <h2 className="mb-4 text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Employee Salary Details
        </h2>
        <div
          ref={tableRef}
          className="rounded-xl bg-white border border-gray-200 p-4"
        >
          <SalaryTable data={orgData} />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white px-6 py-4 text-center text-xs text-gray-400">
        Total Annual Payroll: $
        {orgData.totalAnnualPayroll.toLocaleString()} &middot; Confidential
      </footer>

      {/* Chat Dialog */}
      <ChatDialog orgData={orgData} onUpdate={setOrgData} />
    </main>
  );
}
