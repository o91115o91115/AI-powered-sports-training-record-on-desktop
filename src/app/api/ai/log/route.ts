import { NextResponse } from "next/server";
import { parseDailyLog } from "@/services/ai/logging-agent";

export async function POST(request: Request) {
  const body = await request.json();
  const result = await parseDailyLog(body);

  return NextResponse.json(result);
}
