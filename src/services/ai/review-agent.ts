import { zodResponseFormat } from "openai/helpers/zod";

import {
  reviewFeedbackSchema,
  type ReviewFeedback
} from "@/schemas/ai/review-feedback";
import { getOpenAIClient, getOpenAIModel } from "./openai-client";

export type ReviewAgentContext = {
  goalLabel: string;
  planSummary: string | null;
  trainingDay: {
    date: string;
    trainingType: string;
    targetDistanceKm: number | null;
    targetDurationMin: number | null;
    targetPace: string | null;
    targetIntensity: string | null;
    description: string | null;
    recoverySuggestion: string | null;
  };
  workoutLog: {
    rawInput: string;
    workoutType: string | null;
    distanceKm: number | null;
    durationMin: number | null;
    pace: string | null;
    fatigueScore: number | null;
    painLocation: string | null;
    painScore: number | null;
    completionStatus: string | null;
  } | null;
  foodLogs: Array<{
    rawInput: string;
    mealType: string | null;
    estimatedCarbsG: number | null;
    estimatedProteinG: number | null;
    estimatedCalories: number | null;
    estimateNote: string | null;
  }>;
};

export async function generateReviewFeedback(
  context: ReviewAgentContext
): Promise<{ feedback: ReviewFeedback; model: string; promptSnapshot: string }> {
  const client = getOpenAIClient();
  const model = getOpenAIModel();
  const promptSnapshot = JSON.stringify(context);

  const response = await client.beta.chat.completions.parse({
    model,
    messages: [
      {
        role: "system",
        content:
          "你是保守且重視安全的耐力訓練回饋助理。你只能依據提供的訓練日、實際訓練紀錄與飲食紀錄回饋，不得做醫療診斷，不得編造不存在的紀錄。所有使用者可見文字必須使用繁體中文，schema enum/code 不需翻譯。"
      },
      {
        role: "user",
        content: `請根據以下資料產生今日回饋，並完全依照 schema 回傳。

資料：
${promptSnapshot}

規則：
1. 若沒有實際訓練與飲食紀錄，summary 要說明需要更多紀錄，trainingAnalysis 與 nutritionAnalysis 可為 null。
2. 若有實際訓練，分析是否符合當日計畫、距離/時間/強度是否偏離、完成狀態是否合理。
3. 若有疲勞分數偏高、疼痛、受傷、頭暈、胸悶或異常不適，riskWarning 必須提醒降低強度或尋求專業協助；不可宣稱醫療診斷。
4. 若有飲食紀錄，分析碳水、蛋白質、熱量與補給是否大致支援當日訓練；不得提供極端節食建議。
5. 若資訊不足，請把需要補充的資料放進 missingInformation，不要自行編造。
6. shouldReplan 只有在高風險、連續偏離、明顯無法完成計畫或疼痛疲勞需要調整時才為 true。
7. summary、trainingAnalysis、nutritionAnalysis、riskWarning、nextStepSuggestion、missingInformation 等使用者可見文字必須使用繁體中文，不得夾雜英文句子；只有使用者原文、品牌名稱、配速單位或必要專有名詞可保留英文。`
      }
    ],
    response_format: zodResponseFormat(reviewFeedbackSchema, "review_feedback")
  });

  const feedback = response.choices[0]?.message.parsed;

  if (!feedback) {
    throw new Error("Failed to parse review feedback from OpenAI response.");
  }

  return { feedback, model, promptSnapshot };
}
