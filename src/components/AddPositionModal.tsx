"use client";

import { useState } from "react";
import { Employee } from "@/lib/types";

interface AddPositionModalProps {
  departments: string[];
  defaultDept?: string;
  defaultLevel?: number;
  onAdd: (emp: Employee, target: { level: number; department?: string }) => void;
  onClose: () => void;
}

export default function AddPositionModal({
  departments,
  defaultDept,
  defaultLevel = 2,
  onAdd,
  onClose,
}: AddPositionModalProps) {
  const [position, setPosition] = useState("");
  const [name, setName] = useState("");
  const [dept, setDept] = useState(defaultDept || "");
  const [level, setLevel] = useState(defaultLevel);
  const [vacant, setVacant] = useState(true);

  const handleAdd = () => {
    if (!position.trim()) return;
    const emp: Employee = {
      name: name.trim() || "[Vacant]",
      position: position.trim(),
      department: dept,
      level,
      startDate: "",
      visaStatus: "",
      payFrequency: "",
      hourlyRate: 0,
      annualSalary: 0,
      monthlySalary: 0,
      vacant: !name.trim() || vacant,
    };
    onAdd(emp, { level, department: dept || undefined });
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.3)", zIndex: 200 }} />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 201,
          backgroundColor: "#fff",
          borderRadius: 12,
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          padding: 24,
          width: 360,
        }}
      >
        <h3 style={{ margin: "0 0 16px", fontWeight: 700, fontSize: 16, color: "#1E3A5F" }}>Add Position</h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={ls}>
            Position *
            <input value={position} onChange={(e) => setPosition(e.target.value)} style={is} placeholder="e.g. Site Supervisor" autoFocus />
          </label>

          <label style={ls}>
            Name (leave empty for vacant)
            <input value={name} onChange={(e) => setName(e.target.value)} style={is} placeholder="e.g. John Smith" />
          </label>

          <label style={ls}>
            Department
            <select value={dept} onChange={(e) => setDept(e.target.value)} style={is}>
              <option value="">— None —</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>

          <label style={ls}>
            Level
            <select value={level} onChange={(e) => setLevel(parseFloat(e.target.value))} style={is}>
              <option value={0}>0 - Director</option>
              <option value={1}>1 - Manager</option>
              <option value={2}>2 - Staff</option>
            </select>
          </label>

          {name && (
            <label style={{ ...ls, flexDirection: "row", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={vacant} onChange={(e) => setVacant(e.target.checked)} />
              <span>Mark as vacant</span>
            </label>
          )}
        </div>

        <div style={{ marginTop: 20, display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 14 }}>Cancel</button>
          <button
            onClick={handleAdd}
            disabled={!position.trim()}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: position.trim() ? "#1E3A5F" : "#9CA3AF",
              color: "#fff",
              cursor: position.trim() ? "pointer" : "not-allowed",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Add
          </button>
        </div>
      </div>
    </>
  );
}

const ls: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 600, color: "#374151" };
const is: React.CSSProperties = { padding: "6px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13, outline: "none" };
