import * as XLSX from "xlsx";

/**
 * Reads an Excel file and returns raw row data as a 2D array.
 * All date serial numbers are converted to readable strings.
 */
export function excelToRows(buffer: ArrayBuffer): unknown[][] {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: true,
  });

  // Convert Excel serial dates to readable date strings
  // Walk each cell — if it's a number in a column that typically holds dates,
  // we still send it as-is and let Claude interpret. But for cells that the
  // workbook has formatted as dates, convert them.
  const dateFormattedCols = detectDateColumns(sheet);

  return rows.map((row) =>
    row.map((cell, colIdx) => {
      if (
        typeof cell === "number" &&
        dateFormattedCols.has(colIdx) &&
        cell > 1 &&
        cell < 200000
      ) {
        const parsed = XLSX.SSF.parse_date_code(cell);
        if (parsed) {
          const y = parsed.y;
          const m = String(parsed.m).padStart(2, "0");
          const d = String(parsed.d).padStart(2, "0");
          return `${y}-${m}-${d}`;
        }
      }
      return cell;
    })
  );
}

/** Detect which columns have date-formatted cells in the workbook */
function detectDateColumns(sheet: XLSX.WorkSheet): Set<number> {
  const dateCols = new Set<number>();
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");

  for (let c = range.s.c; c <= range.e.c; c++) {
    for (let r = range.s.r; r <= range.e.r; r++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[addr];
      if (cell && cell.t === "n" && cell.z && /[dmy]/i.test(cell.z)) {
        dateCols.add(c);
        break;
      }
    }
  }
  return dateCols;
}
