"use client";

import { useRef, useState, useCallback } from "react";
import FileUploader from "@/components/FileUploader";
import OrgChart from "@/components/OrgChart";
import SalaryTable from "@/components/SalaryTable";
import PdfExporter from "@/components/PdfExporter";
import ChatDialog from "@/components/ChatDialog";
import EditPanel from "@/components/EditPanel";
import ContextMenu from "@/components/ContextMenu";
import AddPositionModal from "@/components/AddPositionModal";
import LoginPage from "@/components/LoginPage";
import { useOrgData } from "@/hooks/useOrgData";
import { useAuth } from "@/contexts/AuthContext";
import { Employee, DepartmentGroup, OrgData } from "@/lib/types";
import {
  updateEmployee,
  deleteEmployee,
  addEmployee,
  addDepartment,
  deleteDepartment,
  renameDepartment,
} from "@/lib/orgDataHelpers";

export default function Home() {
  const { user, isGuest, loading: authLoading, logout, touchSession } = useAuth();
  const { orgData, setOrgData, error, loading, processFile, reset } = useOrgData();
  const chartRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);

  // Context menu
  const [ctxMenu, setCtxMenu] = useState<{
    x: number;
    y: number;
    items: { icon: string; label: string; onClick: () => void; danger?: boolean }[];
  } | null>(null);

  // Add modal
  const [addModal, setAddModal] = useState<{
    defaultDept?: string;
    defaultLevel?: number;
  } | null>(null);

  // Prompt for text input (rename dept, etc.)
  const [promptState, setPromptState] = useState<{
    title: string;
    value: string;
    onConfirm: (val: string) => void;
  } | null>(null);

  // Confirm dialog
  const [confirmState, setConfirmState] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // ── Callbacks ──

  const handleSaveEmployee = useCallback(
    (oldName: string, updated: Employee) => {
      if (!orgData) return;
      setOrgData(updateEmployee(orgData, oldName, updated));
      setEditingEmp(null);
    },
    [orgData, setOrgData]
  );

  const handleDeleteEmployee = useCallback(
    (name: string) => {
      if (!orgData) return;
      setConfirmState({
        message: `Delete "${name}"?`,
        onConfirm: () => {
          setOrgData(deleteEmployee(orgData, name));
          setEditingEmp(null);
          setConfirmState(null);
        },
      });
    },
    [orgData, setOrgData]
  );

  const handleAddEmployee = useCallback(
    (emp: Employee, target: { level: number; department?: string }) => {
      if (!orgData) return;
      setOrgData(addEmployee(orgData, emp, target));
      setAddModal(null);
    },
    [orgData, setOrgData]
  );

  // ── Context menu builders ──

  const onCardContext = useCallback(
    (emp: Employee, x: number, y: number) => {
      setCtxMenu({
        x,
        y,
        items: [
          { icon: "\u270E", label: "Edit", onClick: () => setEditingEmp(emp) },
          {
            icon: "\uD83D\uDC64",
            label: "Add Colleague",
            onClick: () =>
              setAddModal({ defaultDept: emp.department, defaultLevel: emp.level }),
          },
          {
            icon: "\uD83D\uDC65",
            label: "Add Subordinate",
            onClick: () =>
              setAddModal({ defaultDept: emp.department, defaultLevel: Math.min(emp.level + 1, 2) }),
          },
          {
            icon: "\uD83D\uDDD1",
            label: "Delete",
            danger: true,
            onClick: () => handleDeleteEmployee(emp.name),
          },
        ],
      });
    },
    [handleDeleteEmployee]
  );

  const onDeptContext = useCallback(
    (dept: DepartmentGroup, x: number, y: number) => {
      if (!orgData) return;
      setCtxMenu({
        x,
        y,
        items: [
          {
            icon: "\u2795",
            label: "Add Position",
            onClick: () => setAddModal({ defaultDept: dept.name, defaultLevel: 2 }),
          },
          {
            icon: "\u270E",
            label: "Rename Department",
            onClick: () =>
              setPromptState({
                title: `Rename "${dept.name}"`,
                value: dept.name,
                onConfirm: (val) => {
                  if (val.trim() && val !== dept.name) {
                    setOrgData(renameDepartment(orgData, dept.name, val.trim()));
                  }
                  setPromptState(null);
                },
              }),
          },
          {
            icon: "\uD83D\uDDD1",
            label: "Delete Department",
            danger: true,
            onClick: () =>
              setConfirmState({
                message: `Delete department "${dept.name}" and all its staff?`,
                onConfirm: () => {
                  setOrgData(deleteDepartment(orgData, dept.name));
                  setConfirmState(null);
                },
              }),
          },
        ],
      });
    },
    [orgData, setOrgData]
  );

  const onBlankContext = useCallback(
    (x: number, y: number) => {
      if (!orgData) return;
      setCtxMenu({
        x,
        y,
        items: [
          {
            icon: "\u2795",
            label: "Add Department",
            onClick: () =>
              setPromptState({
                title: "New Department Name",
                value: "",
                onConfirm: (val) => {
                  if (val.trim()) {
                    const colors = ["#8B5CF6", "#EC4899", "#F97316", "#14B8A6", "#6366F1", "#EF4444"];
                    const usedColors = orgData.departments.map((d) => d.color);
                    const color = colors.find((c) => !usedColors.includes(c)) || "#6B7280";
                    setOrgData(addDepartment(orgData, val.trim(), color));
                  }
                  setPromptState(null);
                },
              }),
          },
          {
            icon: "\uD83D\uDC64",
            label: "Add Independent Position",
            onClick: () => setAddModal({ defaultLevel: 1 }),
          },
        ],
      });
    },
    [orgData, setOrgData]
  );

  // Wrap processFile to touch session
  const handleFile = async (file: File) => {
    await processFile(file);
    touchSession();
  };

  // Auth gate
  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <p className="text-sm text-gray-500">加载中...</p>
      </main>
    );
  }

  if (!user && !isGuest) {
    return <LoginPage />;
  }

  // Upload page
  if (!orgData) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#F8FAFC] px-4">
        {/* User bar */}
        <div className="fixed top-0 right-0 p-4 flex items-center gap-3 z-10">
          {user && (
            <>
              <span className="text-xs text-gray-500">{user.email}</span>
              <button
                onClick={logout}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                退出登录
              </button>
            </>
          )}
          {isGuest && !user && (
            <span className="text-xs text-gray-400">游客模式</span>
          )}
        </div>

        <div className="w-full max-w-xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-[#1E3A5F]">PJ Org Chart Generator</h1>
            <p className="mt-2 text-sm text-gray-500">
              Upload an Excel employee spreadsheet to generate an organisation chart with PDF export
            </p>
          </div>
          <FileUploader onFile={handleFile} loading={loading} />
          {error && (
            <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="mt-8 rounded-lg bg-white border border-gray-200 px-6 py-5">
            <h2 className="text-sm font-semibold text-gray-700">Expected Excel Format</h2>
            <ul className="mt-2 space-y-1 text-xs text-gray-500">
              <li>Row 1: Company name</li>
              <li>Row 2: Date (e.g. &quot;As at 10 March 2026&quot;)</li>
              <li>Row 4: Headers — Employee | Start Date | Position | Visa Status | Pay Frequency | Hourly Rate | Annual Salary | Monthly Salary</li>
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
          <h1 className="text-lg font-bold text-[#1E3A5F]">{orgData.companyName}</h1>
          <p className="text-xs text-gray-500">
            As at {orgData.asAtDate} &middot; {orgData.totalEmployees} employees
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Edit Mode toggle */}
          <button
            onClick={() => setEditMode(!editMode)}
            className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              editMode
                ? "bg-amber-100 text-amber-800 border border-amber-300"
                : "border border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {editMode ? "Exit Edit Mode" : "Edit Mode"}
          </button>
          <PdfExporter data={orgData} chartRef={chartRef} tableRef={tableRef} />
          <button
            onClick={reset}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Re-upload
          </button>
          {user && (
            <button
              onClick={logout}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              退出登录
            </button>
          )}
        </div>
      </div>

      {/* Edit mode banner */}
      {editMode && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 text-xs text-amber-700 edit-ui">
          <strong>Edit Mode</strong> — click cards to edit, right-click for options, click + to add positions
        </div>
      )}

      {/* Org Chart section */}
      <section className="px-6 py-8">
        <h2 className="mb-4 text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Organisation Chart
        </h2>
        <div ref={chartRef} className="rounded-xl bg-[#F8FAFC] border border-gray-200 p-8">
          <OrgChart
            data={orgData}
            editMode={editMode}
            onCardClick={setEditingEmp}
            onCardContext={onCardContext}
            onDeptContext={onDeptContext}
            onBlankContext={onBlankContext}
            onAddToDept={(deptName) => setAddModal({ defaultDept: deptName, defaultLevel: 2 })}
            onAddManager={() => setAddModal({ defaultLevel: 1 })}
          />
        </div>
      </section>

      {/* Salary Table section */}
      <section className="px-6 pb-8">
        <h2 className="mb-4 text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Employee Salary Details
        </h2>
        <div ref={tableRef} className="rounded-xl bg-white border border-gray-200 p-4">
          <SalaryTable data={orgData} />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white px-6 py-4 text-center text-xs text-gray-400">
        Total Annual Payroll: ${orgData.totalAnnualPayroll.toLocaleString()} &middot; Confidential
      </footer>

      {/* Chat Dialog */}
      <ChatDialog orgData={orgData} onUpdate={setOrgData} />

      {/* ── Edit overlays ── */}

      {editingEmp && (
        <EditPanel
          employee={editingEmp}
          orgData={orgData}
          onSave={handleSaveEmployee}
          onClose={() => setEditingEmp(null)}
        />
      )}

      {ctxMenu && (
        <ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={ctxMenu.items} onClose={() => setCtxMenu(null)} />
      )}

      {addModal && (
        <AddPositionModal
          departments={orgData.departments.map((d) => d.name)}
          defaultDept={addModal.defaultDept}
          defaultLevel={addModal.defaultLevel}
          onAdd={handleAddEmployee}
          onClose={() => setAddModal(null)}
        />
      )}

      {/* Prompt dialog */}
      {promptState && (
        <>
          <div onClick={() => setPromptState(null)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.3)", zIndex: 200 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 201, background: "#fff", borderRadius: 12, padding: 24, width: 320, boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
            <h3 style={{ margin: "0 0 12px", fontWeight: 700, fontSize: 15, color: "#1E3A5F" }}>{promptState.title}</h3>
            <input
              autoFocus
              defaultValue={promptState.value}
              onKeyDown={(e) => { if (e.key === "Enter") promptState.onConfirm((e.target as HTMLInputElement).value); }}
              style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13, boxSizing: "border-box" }}
              id="prompt-input"
            />
            <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setPromptState(null)} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 13 }}>Cancel</button>
              <button
                onClick={() => promptState.onConfirm((document.getElementById("prompt-input") as HTMLInputElement).value)}
                style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "#1E3A5F", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
              >
                OK
              </button>
            </div>
          </div>
        </>
      )}

      {/* Confirm dialog */}
      {confirmState && (
        <>
          <div onClick={() => setConfirmState(null)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.3)", zIndex: 200 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 201, background: "#fff", borderRadius: 12, padding: 24, width: 320, boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
            <p style={{ margin: "0 0 16px", fontSize: 14, color: "#374151" }}>{confirmState.message}</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmState(null)} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 13 }}>Cancel</button>
              <button
                onClick={confirmState.onConfirm}
                style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "#DC2626", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
              >
                Confirm
              </button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
