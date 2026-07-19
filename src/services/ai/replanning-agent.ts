import { zodResponseFormat } from "openai/helpers/zod";

import {
  aiPlanAdjustmentConversationSchema,
  aiPlanAdjustmentDraftSchema,
  type AiPlanAdjustmentConversation,
  type AiPlanAdjustmentDraft
} from "@/schemas/ai/replanning";
import type { PlanningConversationMessage } from "@/schemas/ai/planning-conversation";
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
    notes: string | null;
    recoverySuggestion: string | null;
    nutritionSuggestion: {
      carbSuggestion: string | null;
      proteinSuggestion: string | null;
      hydrationSuggestion: string | null;
      preWorkoutSuggestion: string | null;
      postWorkoutSuggestion: string | null;
      longRunFuelSuggestion: string | null;
      restDaySuggestion: string | null;
      estimateNote: string | null;
    } | null;
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

export type PlanAdjustmentConversationAgentInput = Omit<
  ReplanningAgentContext,
  "adjustmentRequest"
> & {
  adjustableAfter: string;
  messages: PlanningConversationMessage[];
  previousConversationStates: AiPlanAdjustmentConversation[];
};

export type PlanAdjustmentConversationAgentResult = {
  aiModel: string;
  result: AiPlanAdjustmentConversation;
  promptSnapshot: string;
};

export async function continuePlanAdjustmentConversation(
  input: PlanAdjustmentConversationAgentInput
): Promise<PlanAdjustmentConversationAgentResult> {
  const client = getOpenAIClient();
  const model = getOpenAIModel();
  const promptSnapshot = JSON.stringify(input);

  const response = await client.beta.chat.completions.parse({
    model,
    messages: [
      {
        role: "system",
        content:
          "你是保守、重視安全，而且溫暖有同理心的耐力訓練計畫調整教練。你的工作是先理解使用者的努力、擔心與限制，再透過精簡對話釐清調整方向；此階段不得產生完整新版課表，也不得宣稱已建立版本。所有使用者可見文字必須使用繁體中文，schema enum/code 不需翻譯。"
      },
      {
        role: "user",
        content: `請根據以下計畫、近期紀錄、AI 建議及對話，整理下一則回覆，並完全依照 schema 回傳。

資料：
${promptSnapshot}

規則：
1. 回覆前必須完整閱讀 messages 與 previousConversationStates，先找出使用者已經回答的內容、AI 先前問過的問題及已整理的調整方向。
2. 不得再次詢問先前 suggestedNextQuestion 已問過的主題。即使使用者回答得簡短、表示不知道或不確定，也不可換句話重問；應依現有資料採保守方案。
3. missingInformation 只能列出尚未詢問、而且答案會實質改變課表的關鍵缺口；不得重複列出已問過或使用者已回答的內容。
4. 每次最多提出一個新問題。若沒有真正新的必要問題，suggestedNextQuestion 必須填 null，並邀請使用者確認產生新版本。
5. assistantMessage 使用溫暖教練語氣：先用一句話具體承接使用者的努力、擔心或限制，再簡短重述目前理解，最後只提出一個新問題或邀請確認。不要空泛稱讚，也不要像制式客服。
6. adjustmentSummary 只能放已確認且有實質語意的調整方向；不得回傳「/」、「-」、「無」或只有標點的佔位文字。尚無法整理時填 null。
7. 當調整方向已足以安全產生新版時，readiness 使用 ready_to_generate，並提醒使用者按「確認產生新版本」。
8. 若有疼痛、高疲勞或明顯風險，readiness 使用 high_risk，提出保守替代方向並提醒降低強度或尋求專業協助；不得做醫療診斷。高風險不代表必須無限追問，已有足夠方向時應停止提問並讓使用者確認產生保守版本。
9. 本次只能討論 ${input.adjustableAfter} 之後的訓練。今天與更早日期已鎖定，不可要求回頭修改。
10. 不可突然大幅增加跑量、強度或訓練頻率，不可提供極端節食或不安全補給建議。
11. 不得輸出完整每日課表；若近期 AI 建議或紀錄不足，應明確說明真正需要的資料，不得自行編造。
12. 所有文字欄位只能使用繁體中文一般文字；只有使用者原文、品牌名稱、配速單位或必要專有名詞可保留英文。`
      }
    ],
    response_format: zodResponseFormat(
      aiPlanAdjustmentConversationSchema,
      "plan_adjustment_conversation"
    )
  });

  const result = response.choices[0]?.message.parsed;

  if (!result) {
    throw new Error("Failed to parse plan adjustment conversation response.");
  }

  return {
    aiModel: model,
    result,
    promptSnapshot
  };
}

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
          "你是保守且重視安全的耐力訓練計畫調整助理。請依使用者調整需求，在最小必要範圍內產生新版草稿；不得覆蓋舊版本，不得做醫療診斷。所有使用者可見文字必須使用繁體中文，schema enum/code 不需翻譯。"
      },
      {
        role: "user",
        content: `請根據以下資料產生訓練計畫調整草稿，並完全依照 schema 回傳。

資料：
${promptSnapshot}

規則：
1. 使用者調整需求是最高優先的修訂依據，但若需求不安全，請用保守替代方案並在文字中說明。
2. adjustedPlan.trainingDays 只能回傳需要調整的日期；後端會用 activeTrainingDays 的完整日期做基底合併。
3. 若回傳某日期，該日期會覆蓋原 active version 的同一天，因此必須提供完整訓練內容與 nutritionSuggestion。
4. 不可回傳 activeTrainingDays 以外的日期；activeTrainingDays 已只包含允許調整的未來日期。
5. 除非使用者明確要求且安全合理，未受影響日期應盡量維持原計畫。
6. 不可突然大幅增加跑量、強度或訓練頻率。
7. 若近期有疼痛、高疲勞或風險提醒，應保守降載、增加恢復或改為低衝擊訓練。
8. 若飲食補給不足，nutritionSuggestion 要加入保守且安全的補給提醒，不可提供極端節食建議。
9. affectedDates 必須列出主要被調整的日期。
10. beforeSummary 與 afterSummary 要讓使用者能比較調整前後差異。
11. reasonDescription 必須提到使用者的調整需求與採用的調整策略。
12. 所有文字欄位只能放繁體中文一般文字，不得夾雜英文句子、JSON 片段或 markdown code block；只有 trainingType 等 schema enum/code、使用者原文、品牌名稱、配速單位或必要專有名詞可保留英文。`
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
