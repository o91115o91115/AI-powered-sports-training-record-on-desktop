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
  const model = getOpenAIModel();
  const logDate = parsedInput.logDate ?? "未提供";

  const response = await client.beta.chat.completions.parse({
    model,
    messages: [
      {
        role: "system",
        content:
          "你是保守且重視安全的運動與飲食紀錄解析助理。只能依照 response_format schema 輸出資料，不得輸出醫療診斷。資訊不足時使用 null 並補入 missingInformation，不要自行編造。所有使用者可見文字必須使用繁體中文，schema enum/code 不需翻譯。"
      },
      {
        role: "user",
        content: `紀錄日期：${logDate}
使用者輸入：
${parsedInput.text}

解析規則：
1. 如果文字包含訓練完成情況，填入 workout；否則 workout 為 null。
2. 如果文字包含飲食內容，填入 nutritionEntries；否則 nutritionEntries 為空陣列。
3. 原始文字由後端保存，不需要放入回傳 schema。
4. completionStatus 只能使用 completed、partial、missed、changed、rest。
5. mealType 只能使用 breakfast、lunch、dinner、pre_workout、post_workout、fuel、snack、other。
6. 依餐別或明確用餐時點拆分 nutritionEntries，例如早餐、午餐、跑前與跑後各自一筆；同一餐的不同食物放在同一筆，不要把每項食材拆成獨立紀錄。
7. 每筆 nutritionEntries 的 foodItems 要列出該餐可辨識的餐點或食物名稱。
8. 只要有可辨識的餐點或食物，請針對每一筆大概估算 estimatedCarbsG、estimatedProteinG、estimatedCalories。若使用者沒有提供份量，請依一般單份台灣常見份量保守估算，並在 estimateNote 說明「依一般份量粗估」與主要假設。
9. 只有在食物內容過於模糊到無法判斷，例如「吃了一些東西」，才把該筆營養數字填 null，並在 missingInformation 說明需要補充食物或份量。
10. 飲食估算不可給極端節食或醫療建議；每筆 estimateNote 都要提醒數值為粗估。
11. 若提到疼痛、受傷、頭暈、胸悶、極度疲勞或其他風險，safetyNote 要提醒降低強度或尋求專業協助。
12. 所有 string 欄位只能放繁體中文一般文字，不得夾雜英文句子、JSON 片段、markdown code block 或多餘括號；只有 completionStatus、mealType 等 schema enum/code、使用者原文、品牌名稱、食物原名或必要專有名詞可保留英文。`
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
