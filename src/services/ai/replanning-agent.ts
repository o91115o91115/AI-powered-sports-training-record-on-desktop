import { zodResponseFormat } from "openai/helpers/zod";

import {
  aiPlanAdjustmentDraftSchema,
  type AiPlanAdjustmentDraft
} from "@/schemas/ai/replanning";
import { getOpenAIClient, getOpenAIModel } from "./openai-client";

export type ReplanningAgentContext = {
  adjustmentRequest: string;
  plan: {
    title: string;
    goalLabel: string;
    startDate: string | null;
    endDate: string | null;
    activeVersionSummary: string | null;
  };
  activeTrainingDays: Array<{
    date: string;
    trainingType: string;
    targetDistanceKm: number | null;
    targetDurationMin: number | null;
    targetPace: string | null;
    targetIntensity: string | null;
    description: string | null;
    recoverySuggestion: string | null;
  }>;
  recentWorkoutLogs: Array<{
    logDate: string;
    rawInput: string;
    distanceKm: number | null;
    durationMin: number | null;
    fatigueScore: number | null;
    painLocation: string | null;
    painScore: number | null;
    completionStatus: string | null;
  }>;
  recentFoodLogs: Array<{
    logDate: string;
    rawInput: string;
    estimatedCarbsG: number | null;
    estimatedProteinG: number | null;
    estimatedCalories: number | null;
  }>;
  recentFeedback: Array<{
    summary: string;
    trainingAnalysis: string | null;
    nutritionAnalysis: string | null;
    riskWarning: string | null;
    nextStepSuggestion: string | null;
    shouldReplan: boolean;
  }>;
};

export type ReplanningAgentResult = {
  aiModel: string;
  draft: AiPlanAdjustmentDraft;
  promptSnapshot: string;
};

export async function createPlanAdjustmentDraft(
  context: ReplanningAgentContext
): Promise<ReplanningAgentResult> {
  const client = getOpenAIClient();
  const model = getOpenAIModel();
  const promptSnapshot = JSON.stringify(context);

  const response = await client.beta.chat.completions.parse({
    model,
    messages: [
      {
        role: "system",
        content:
          "你是保守且重視安全的耐力訓練計畫調整助理。請依使用者調整需求，在最小必要範圍內產生新版草稿；不得覆蓋舊版本，不得做醫療診斷。"
      },
      {
        role: "user",
        content: `請根據以下資料產生訓練計畫調整草稿，並完全依照 schema 回傳。

資料：
${promptSnapshot}

規則：
1. 使用者調整需求是最高優先的修訂依據，但若需求不安全，請用保守替代方案並在文字中說明。
2. adjustedPlan.trainingDays 可以只回傳需要調整的日期，也可以回完整計畫；後端會用 activeTrainingDays 的完整日期做基底合併。
3. 若回傳某日期，該日期會覆蓋原 active version 的同一天，因此必須提供完整訓練內容與 nutritionSuggestion。
4. 不可回傳 activeTrainingDays 以外的日期。
5. 除非使用者明確要求且安全合理，未受影響日期應盡量維持原計畫。
6. 不可突然大幅增加跑量、強度或訓練頻率。
7. 若近期有疼痛、高疲勞或風險提醒，應保守降載、增加恢復或改為低衝擊訓練。
8. 若飲食補給不足，nutritionSuggestion 要加入保守且安全的補給提醒，不可提供極端節食建議。
9. affectedDates 必須列出主要被調整的日期。
10. beforeSummary 與 afterSummary 要讓使用者能比較調整前後差異。
11. reasonDescription 必須提到使用者的調整需求與採用的調整策略。
12. 所有文字欄位只能放一般文字，不得放 JSON 片段或 markdown code block。`
      }
    ],
    response_format: zodResponseFormat(aiPlanAdjustmentDraftSchema, "plan_adjustment_draft")
  });

  const draft = response.choices[0]?.message.parsed;

  if (!draft) {
    throw new Error("Failed to parse plan adjustment draft from OpenAI response.");
  }

  return {
    aiModel: model,
    draft,
    promptSnapshot
  };
}
