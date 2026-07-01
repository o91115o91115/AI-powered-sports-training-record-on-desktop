import { zodResponseFormat } from "openai/helpers/zod";
import {
  dailyLogInputSchema,
  parsedDailyLogSchema,
  type ParsedDailyLog
} from "@/schemas/ai/daily-log";
import { getOpenAIClient, getOpenAIModel } from "./openai-client";

export async function parseDailyLog(input: unknown): Promise<ParsedDailyLog> {
  const parsedInput = dailyLogInputSchema.parse(input);
  const client = getOpenAIClient();

  const response = await client.beta.chat.completions.parse({
    model: getOpenAIModel(),
    messages: [
      {
        role: "system",
        content:
          "你是運動與飲食紀錄整理助理。請只整理使用者明確提供的資訊；營養數字需標示為估算；不可做醫療診斷。"
      },
      {
        role: "user",
        content: `紀錄日期：${parsedInput.logDate ?? "未指定"}\n使用者輸入：${parsedInput.text}`
      }
    ],
    response_format: zodResponseFormat(parsedDailyLogSchema, "parsed_daily_log")
  });

  const result = response.choices[0]?.message.parsed;

  if (!result) {
    throw new Error("Failed to parse daily log from OpenAI response.");
  }

  return result;
}
