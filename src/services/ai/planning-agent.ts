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
};

export type PlanningAgentResult = {
  aiModel: string;
  draft: AiTrainingPlanDraft;
  promptSnapshot: string;
};

const formatDate = (date: Date | null) => date?.toISOString().slice(0, 10) ?? "未提供";

function buildPlanningPrompt(input: PlanningAgentInput) {
  const { userProfile, trainingGoal } = input;

  // Prompt 必須清楚保留安全邊界，避免 AI 產生醫療診斷或過度激進訓練量。
  return `請根據以下使用者資料，產生一份可儲存為草稿的跑步訓練與營養計畫。

使用者基本資料：
- 名稱：${userProfile.name}
- 年齡：${userProfile.age ?? "未提供"}
- 性別：${userProfile.gender ?? "未提供"}
- 身高：${userProfile.heightCm ?? "未提供"} cm
- 體重：${userProfile.weightKg ?? "未提供"} kg
- 飲食限制：${userProfile.dietaryRestrictions ?? "未提供"}

訓練目標與目前能力：
- 目標賽事：${trainingGoal.raceName ?? "未提供"}
- 目標距離：${trainingGoal.targetDistance}
- 比賽日期：${formatDate(trainingGoal.raceDate)}
- 目標完賽時間：${trainingGoal.targetFinishTime ?? "未提供"}
- 目標類型：${trainingGoal.goalType ?? "未提供"}
- 目前週跑量：${trainingGoal.currentWeeklyMileageKm ?? "未提供"} km
- 最近 5K：${trainingGoal.recentFiveKTime ?? "未提供"}
- 最近 10K：${trainingGoal.recentTenKTime ?? "未提供"}
- 最近半馬：${trainingGoal.recentHalfMarathonTime ?? "未提供"}
- 是否有全馬經驗：${trainingGoal.hasMarathonExperience ? "是" : "否"}
- 每週可訓練天數：${trainingGoal.weeklyTrainingDays ?? "未提供"}
- 偏好訓練日：${trainingGoal.preferredTrainingDays ?? "未提供"}
- 不方便訓練日期：${trainingGoal.unavailableDates ?? "未提供"}
- 傷痛描述：${trainingGoal.injuryNote ?? "未提供"}
- 疲勞狀況：${trainingGoal.fatigueLevel ?? "未提供"}

輸出規則：
1. 只能輸出符合指定 JSON schema 的資料。
2. 不得宣稱保證完賽、保證 PB 或保證成績。
3. 不得做醫療診斷；若有傷痛、高疲勞、胸悶、頭暈或呼吸異常風險，請加入保守安全提醒。
4. 不得短期大幅增加跑量，不得連續安排過多高強度訓練。
5. 若資料不足，請在 missingInformation 說明，但仍可產生保守草稿。
6. 每日營養建議需標示為方向性估算，不可包裝成醫療或營養師診斷。
7. trainingDays 日期需落在 startDate 與 endDate 之間，若比賽日期不足，請產生 4 週保守草稿。
8. trainingType 只能使用 easy、long_run、tempo、interval、rest、cross_training、race。`;
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
          "你是保守且重視風險控管的跑步訓練規劃助理。請產生可被前端與資料庫穩定解析的 JSON。"
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
