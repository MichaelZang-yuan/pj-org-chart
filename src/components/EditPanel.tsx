"use client";

import { useState, useEffect } from "react";
import { Employee, OrgData } from "@/lib/types";
import { allEmployees } from "@/lib/orgDataHelpers";

interface EditPanelProps {
  employee: Employee;
  orgData: OrgData;
  onSave: (oldName: string, updated: Employee) => void;
  onClose: () => void;
}

export default function EditPanel({ employee, orgData, onSave, onClose }: EditPanelProps) {
  const [form, setForm] = useState<Employee>({ ...employee });

  useEffect(() => {
    setForm({ ...employee });
  }, [employee]);

  const set = (field: keyof Employee, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const departments = orgData.departments.map((d) => d.name);
  const employees = allEmployees(orgData).filter((e) => e.name !== employee.name);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: 360,
        backgroundColor: "#fff",
        boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, color: "#1E3A5F", margin: 0 }}>Edit Employee</h3>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#6B7280" }}>&times;</button>
      </div>

      {/* Form */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Name" value={form.name} onChange={(v) => set("name", v)} />
          <Field label="Position" value={form.position} onChange={(v) => set("position", v)} />

          <label style={labelStyle}>Department
            <select value={form.department} onChange={(e) => set("department", e.target.value)} style={inputStyle}>
              <option value="">—</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>

          <label style={labelStyle}>Level
            <input type="number" step="0.5" min="0" max="3" value={form.level} onChange={(e) => set("level", parseFloat(e.target.value) || 0)} style={inputStyle} />
          </label>

          <Field label="Start Date" value={form.startDate} onChange={(v) => set("startDate", v)} />
          <Field label="Visa Status" value={form.visaStatus} onChange={(v) => set("visaStatus", v)} />

          <label style={labelStyle}>Pay Frequency
            <select value={form.payFrequency} onChange={(e) => set("payFrequency", e.target.value)} style={inputStyle}>
              <option value="">—</option>
              <option value="Monthly">Monthly</option>
              <option value="Fortnightly">Fortnightly</option>
              <option value="Weekly">Weekly</option>
            </select>
          </label>

          <Field label="Hourly Rate" value={String(form.hourlyRate || "")} onChange={(v) => set("hourlyRate", parseFloat(v) || 0)} type="number" />
          <Field label="Annual Salary" value={String(form.annualSalary || "")} onChange={(v) => set("annualSalary", parseFloat(v) || 0)} type="number" />
          <Field label="Monthly Salary" value={String(form.monthlySalary || "")} onChange={(v) => set("monthlySalary", parseFloat(v) || 0)} type="number" />

          <label style={{ ...labelStyle, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={form.vacant || false} onChange={(e) => set("vacant", e.target.checked)} />
            <span>Vacant position</span>
          </label>

          <label style={labelStyle}>Reports To
            <select value={form.reportsTo || ""} onChange={(e) => set("reportsTo", e.target.value)} style={inputStyle}>
              <option value="">— None —</option>
              {employees.map((e) => <option key={e.name} value={e.name}>{e.name} ({e.position})</option>)}
            </select>
          </label>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: "12px 20px", borderTop: "1px solid #e5e7eb", display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 14 }}>
          Cancel
        </button>
        <button
          onClick={() => onSave(employee.name, form)}
          style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#1E3A5F", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600 }}
        >
          Save
        </button>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontSize: 12,
  fontWeight: 600,
  color: "#374151",
};

const inputStyle: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid #d1d5db",
  fontSize: 13,
  outline: "none",
};

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label style={labelStyle}>
      {label}
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
    </label>
  );
}
