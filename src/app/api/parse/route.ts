import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a data extraction assistant. You receive raw spreadsheet data as a JSON 2D array (rows × columns). Your job is to analyse it and return a single JSON object matching the schema below. Return ONLY valid JSON — no markdown, no explanation, no extra text.

Schema:
{
  "companyName": string,          // extracted from the spreadsheet header rows
  "asAtDate": string,             // e.g. "10 March 2026"
  "director": Employee | null,    // the top-level director (level 0)
  "managers": Employee[],         // management-level staff (level 1)
  "departments": DepartmentGroup[],
  "totalEmployees": number,       // count of ALL employees including director & managers
  "totalAnnualPayroll": number    // sum of all annualSalary values
}

Employee {
  "name": string,
  "startDate": string,            // ISO date "YYYY-MM-DD", or "" if unknown
  "position": string,
  "visaStatus": string,           // e.g. "Citizen", "Work Visa", or ""
  "payFrequency": string,         // e.g. "Monthly", "Fortnightly", or ""
  "hourlyRate": number,           // 0 if not applicable
  "annualSalary": number,         // 0 if not available
  "monthlySalary": number,        // 0 if not available
  "department": string,           // the department/group this person belongs to
  "level": 0 | 1 | 2             // 0 = Director/CEO, 1 = Manager, 2 = Staff
}

DepartmentGroup {
  "name": string,                 // department name
  "color": string,                // assign a distinct hex color for each department
  "manager": Employee | null,     // the manager who oversees this department, if identifiable
  "staff": Employee[]             // non-management employees in this department
}

Rules:
- Identify the company name and date from header rows (often rows 1-2).
- Detect department groupings — these are often rows where only the first cell has a value and other columns are empty, acting as section headers.
- Skip totals/subtotals rows (rows starting with "Total" or "Grand Total").
- Skip empty rows and header rows.
- For level assignment: Directors/CEOs = 0, Managers or management-level roles = 1, all other staff = 2.
- For department colors, use these if the department name matches: AKL="#DC2626", CHC="#D97706", Forwarding="#059669", Management="#2563EB". Otherwise pick a reasonable distinct hex color.
- The "managers" array in the root should contain ALL level-1 employees.
- The "departments" array should only contain non-management departments (where staff are level 2). Do NOT create a department entry for "Management".
- If a manager's title suggests they manage a specific department (e.g. "Warehouse Manager" → warehouse-related depts, "Forwarding Manager" → forwarding dept), set them as that department's "manager".
- Ensure totalEmployees and totalAnnualPayroll are computed correctly from all employees.
- All salary numbers should be plain numbers (no currency symbols, no commas).
- If a date looks like an Excel serial number, convert it to ISO date format.`;

export async function POST(req: NextRequest) {
  try {
    const { rows } = await req.json();

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "No spreadsheet data provided" },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured" },
        { status: 500 }
      );
    }

    // Truncate very large spreadsheets to stay within token limits
    const maxRows = 200;
    const truncated = rows.length > maxRows ? rows.slice(0, maxRows) : rows;

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `Here is the raw spreadsheet data as a JSON 2D array. Analyse it and return the structured JSON.\n\n${JSON.stringify(truncated)}`,
        },
      ],
      system: SYSTEM_PROMPT,
    });

    // Extract text from response
    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "No text response from Claude" },
        { status: 502 }
      );
    }

    // Parse the JSON - strip markdown code fences if present
    let jsonStr = textBlock.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }

    const orgData = JSON.parse(jsonStr);
    return NextResponse.json(orgData);
  } catch (err) {
    console.error("Parse API error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to parse spreadsheet";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
