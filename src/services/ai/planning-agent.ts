import { zodResponseFormat } from "openai/helpers/zod";

import {
  aiTrainingPlanDraftSchema,
  type AiTrainingPlanDraft
} from "@/schemas/ai/training-plan";
import { getOpenAIClient, getOpenAIModel } from "./openai-client";

export type PlanningAgentInput = {
  userProfile: {
    name: string;
    age: number | null;
    gender: string | null;
    heightCm: number | null;
    weightKg: number | null;
    dietaryRestrictions: string | null;
  };
  trainingGoal: {
    raceName: string | null;
    targetDistance: string;
    raceDate: Date | null;
    targetFinishTime: string | null;
    goalType: string | null;
    currentWeeklyMileageKm: number | null;
    recentFiveKTime: string | null;
    recentTenKTime: string | null;
    recentHalfMarathonTime: string | null;
    hasMarathonExperience: boolean;
    weeklyTrainingDays: number | null;
    preferredTrainingDays: string | null;
    unavailableDates: string | null;
    injuryNote: string | null;
    fatigueLevel: string | null;
  };
  conversationSummary?: string | null;
};

export type PlanningAgentResult = {
  aiModel: string;
  draft: AiTrainingPlanDraft;
  promptSnapshot: string;
};

const formatDate = (date: Date | null) => date?.toISOString().slice(0, 10) ?? "未提供";

const getLocalDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

function buildPlanningPrompt(input: PlanningAgentInput) {
  const { conversationSummary, userProfile, trainingGoal } = input;
  const planStartDate = getLocalDateInput(new Date());
  const planEndDate = formatDate(trainingGoal.raceDate);

  // Prompt 需要清楚列出日期範圍與安全限制，避免 AI 任意縮短計畫或產生過度激進內容。
  return `請根據下列資料，產生一份可保存為草稿的跑步訓練計畫與每日營養建議。

使用者基本資料：
- 姓名：${userProfile.name}
- 年齡：${userProfile.age ?? "未提供"}
- 性別：${userProfile.gender ?? "未提供"}
- 身高：${userProfile.heightCm ?? "未提供"} cm
- 體重：${userProfile.weightKg ?? "未提供"} kg
- 飲食限制：${userProfile.dietaryRestrictions ?? "未提供"}

訓練目標與近期能力：
- 目標賽事：${trainingGoal.raceName ?? "未提供"}
- 目標距離：${trainingGoal.targetDistance}
- 比賽日期：${formatDate(trainingGoal.raceDate)}
- 目標完賽時間：${trainingGoal.targetFinishTime ?? "未提供"}
- 目標類型：${trainingGoal.goalType ?? "未提供"}
- 目前週跑量：${trainingGoal.currentWeeklyMileageKm ?? "未提供"} km
- 近期 5K：${trainingGoal.recentFiveKTime ?? "未提供"}
- 近期 10K：${trainingGoal.recentTenKTime ?? "未提供"}
- 近期半馬：${trainingGoal.recentHalfMarathonTime ?? "未提供"}
- 是否有全馬經驗：${trainingGoal.hasMarathonExperience ? "是" : "否"}
- 每週可訓練天數：${trainingGoal.weeklyTrainingDays ?? "未提供"}
- 偏好訓練日：${trainingGoal.preferredTrainingDays ?? "未提供"}
- 不可訓練日期：${trainingGoal.unavailableDates ?? "未提供"}
- 傷痛說明：${trainingGoal.injuryNote ?? "未提供"}
- 疲勞狀態：${trainingGoal.fatigueLevel ?? "未提供"}

對話補充摘要：
${conversationSummary?.trim() || "未提供"}

計畫日期範圍：
- 訓練起始日期：${planStartDate}
- 訓練結束日期：${planEndDate}
- startDate 必須等於訓練起始日期。
- endDate 必須等於訓練結束日期。
- trainingDays 必須依照每週可訓練天數與偏好訓練日，完整涵蓋訓練起始日期到訓練結束日期之間的週期。
- 不得任意縮短為四週計畫；只有在比賽日期未提供或早於起始日期時，才可在 missingInformation 說明資料不足。

輸出規則：
1. 必須輸出符合指定 JSON schema 的資料。
2. 不得宣稱醫療診斷或保證 PB / 完賽結果。
3. 若有傷痛、疲勞過高、疼痛、暈眩等風險，請加入安全提醒。
4. 不得短期大幅增加跑量，不得連續安排過多高強度訓練。
5. 若資訊不足，請在 missingInformation 說明，不要自行編造高風險訓練內容。
6. 每日營養建議為方向性估算，不得提供極端節食、過度限制熱量或醫療診斷。
7. trainingDays 日期需落在 startDate 與 endDate 之間，並以今天到比賽日期作為完整計畫範圍，不得限制只產出四週。
8. 若對話補充摘要與既有訓練目標衝突，請在 missingInformation 或 riskWarnings 說明，不要自行覆蓋既有資料。
9. trainingType 必須使用 easy、long_run、tempo、interval、rest、cross_training、race。`;
}

export async function createTrainingPlanDraft(
  input: PlanningAgentInput
): Promise<PlanningAgentResult> {
  const client = getOpenAIClient();
  const model = getOpenAIModel();
  const planningPrompt = buildPlanningPrompt(input);
  const responseFormatGuard =
    "格式限制：請嚴格依 response_format schema 回傳。所有 string 欄位只能填入使用者可直接閱讀的純文字句子，不得包含 JSON 語法、欄位名稱、額外引號、陣列或物件結尾符號。營養建議欄位不得出現類似 `\"}}]}` 的結構殘留。";
  const promptSnapshot = `${planningPrompt}\n\n${responseFormatGuard}`;

  const response = await client.beta.chat.completions.parse({
    model,
    messages: [
      {
        role: "system",
        content:
          "你是保守且重視風險控管的跑步訓練規劃助理。請嚴格依 response_format schema 輸出資料；所有字串欄位只能是純文字內容，不得混入 JSON 語法、欄位名稱或結構結尾符號。"
      },
      {
        role: "user",
        content: promptSnapshot
      }
    ],
    response_format: zodResponseFormat(aiTrainingPlanDraftSchema, "training_plan_draft")
  });

  const draft = response.choices[0]?.message.parsed;

  if (!draft) {
    throw new Error("Failed to parse training plan draft from OpenAI response.");
  }

  return {
    aiModel: model,
    draft,
    promptSnapshot
  };
}
