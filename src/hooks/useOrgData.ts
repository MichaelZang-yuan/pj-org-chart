"use client";

import { useState, useCallback } from "react";
import { OrgData } from "@/lib/types";
import { excelToRows } from "@/lib/parseExcel";

export function useOrgData() {
  const [orgData, setOrgData] = useState<OrgData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const processFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);

    try {
      if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
        throw new Error("Please upload an Excel file (.xlsx or .xls)");
      }

      // Step 1: Read Excel into raw 2D array
      const buffer = await file.arrayBuffer();
      const rows = excelToRows(buffer);

      if (rows.length < 2) {
        throw new Error("The spreadsheet appears to be empty.");
      }

      // Step 2: Send to API for Claude-powered parsing
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.error || `Server error (${res.status})`
        );
      }

      const data: OrgData = await res.json();

      // Log parsed employee count for verification
      console.log(`Parsed ${data.totalEmployees} employees from Excel`);

      if (
        !data.director &&
        (!data.managers || data.managers.length === 0) &&
        (!data.departments || data.departments.length === 0)
      ) {
        throw new Error(
          "Could not extract employee data from the spreadsheet. Please check the file contents."
        );
      }

      setOrgData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file");
      setOrgData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setOrgData(null);
    setError(null);
  }, []);

  return { orgData, setOrgData, error, loading, processFile, reset };
}
