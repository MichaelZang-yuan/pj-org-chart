import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an organisation chart editing assistant. You receive the current org chart data as JSON and a user instruction to modify it. Return a JSON object with two fields:

1. "orgData": the complete modified OrgData JSON (same schema as input)
2. "summary": a one-sentence description of what you changed

Schema reminder:
- Employee: { name, startDate, position, visaStatus, payFrequency, hourlyRate, annualSalary, monthlySalary, department, level (0=Director, 1=Manager, 2=Staff), vacant? (boolean, optional) }
- DepartmentGroup: { name, color, manager (Employee|null), staff (Employee[]) }
- OrgData: { companyName, asAtDate, director (Employee|null), managers (Employee[]), departments (DepartmentGroup[]), totalEmployees, totalAnnualPayroll }

Rules:
- Apply the user's instruction to modify the org data.
- For new vacant positions: set vacant=true, name="[Vacant]", and fill position with the specified role. Leave salary/dates/visa as empty/zero.
- When adding a new department, assign a distinct hex color not already used. Known colors: AKL="#DC2626", CHC="#D97706", Forwarding="#059669", Management="#2563EB".
- When removing an employee, remove them from all arrays (director, managers, department staff).
- After any change, recompute totalEmployees (count ALL non-vacant employees including director & managers) and totalAnnualPayroll (sum of all annualSalary values).
- Preserve all existing data that is not affected by the change.
- Return ONLY valid JSON — no markdown, no code fences, no extra text.`;

export async function POST(req: NextRequest) {
  try {
    const { orgData, instruction } = await req.json();

    if (!orgData || !instruction) {
      return NextResponse.json(
        { error: "Missing orgData or instruction" },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Current org data:\n${JSON.stringify(orgData)}\n\nInstruction: ${instruction}`,
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "No text response from Claude" },
        { status: 502 }
      );
    }

    let jsonStr = textBlock.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }

    const result = JSON.parse(jsonStr);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Modify API error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to modify org data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
