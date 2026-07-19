import { zodResponseFormat } from "openai/helpers/zod";

import {
  aiPlanningConversationSchema,
  type AiPlanningConversation,
  type PlanningConversationMessage
} from "@/schemas/ai/planning-conversation";
import type { PlanningAgentInput } from "./planning-agent";
import { getOpenAIClient, getOpenAIModel } from "./openai-client";

export type PlanningConversationAgentInput = PlanningAgentInput & {
  messages: PlanningConversationMessage[];
};

export type PlanningConversationAgentResult = {
  aiModel: string;
  result: AiPlanningConversation;
  promptSnapshot: string;
};

const formatDate = (date: Date | null) => date?.toISOString().slice(0, 10) ?? "未提供";

const formatMessageHistory = (messages: PlanningConversationMessage[]) =>
  messages
    .slice(-12)
    .map((message) => `${message.role === "user" ? "使用者" : "AI"}：${message.content}`)
    .join("\n");

const getUserMessageText = (messages: PlanningConversationMessage[]) =>
  messages
    .filter((message) => message.role === "user")
    .map((message) => message.content)
    .join("\n");

const inferPainStatus = (
  messages: PlanningConversationMessage[],
  injuryNote: string | null
) => {
  const text = `${injuryNote ?? ""}\n${getUserMessageText(messages)}`;
  const explicitNoPainPattern =
    /(沒有|無|沒|未|否認|不會|沒有任何).{0,12}(疼痛|痛|受傷|傷痛|不適)|(?:疼痛|痛|受傷|傷痛|不適).{0,12}(沒有|無|沒|未|否認|不會)/;
  const highRiskPainPattern =
    /(劇痛|刺痛|腫|麻|無力|跛|胸悶|胸痛|頭暈|暈眩|呼吸困難|越來越痛|加劇|急性受傷|拉傷|扭傷)/;
  const mildConcernPattern = /(緊繃|痠|酸|不舒服|微痛|偶爾痛|卡卡)/;

  if (explicitNoPainPattern.test(text)) {
    return "使用者已明確表示沒有疼痛、受傷或不適；此欄位視為已回答，不應再追問疼痛問題。";
  }

  if (highRiskPainPattern.test(text)) {
    return "使用者描述可能的高風險症狀；可提醒降低強度或尋求專業協助，必要時才追問症狀位置、嚴重度與是否加劇。";
  }

  if (mildConcernPattern.test(text)) {
    return "使用者描述輕微不適或緊繃；若已提供位置與程度，不要重複追問疼痛，只需保守整理風險。";
  }

  return "尚未明確取得傷痛狀態；若其他核心資料已足夠，最多用一個簡短問題確認是否有疼痛或受傷。";
};

function buildConversationPrompt(input: PlanningConversationAgentInput) {
  const { userProfile, trainingGoal } = input;
  const history = formatMessageHistory(input.messages);
  const painStatus = inferPainStatus(input.messages, trainingGoal.injuryNote);

  // 對話階段以收斂需求與風險為主；若資料足夠且使用者要求，可提供簡易預覽但不取代正式課表。
  return `你正在協助使用者產生客製跑步訓練課表。請根據既有資料與對話，回覆下一步問題或確認已可產生課表。

既有使用者資料：
- 姓名：${userProfile.name}
- 年齡：${userProfile.age ?? "未提供"}
- 性別：${userProfile.gender ?? "未提供"}
- 身高：${userProfile.heightCm ?? "未提供"} cm
- 體重：${userProfile.weightKg ?? "未提供"} kg
- 飲食限制：${userProfile.dietaryRestrictions ?? "未提供"}

既有訓練目標：
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
- 每週可安排訓練日上限（不含休息日）：${trainingGoal.weeklyTrainingDays ?? "未提供"}
- 偏好訓練日：${trainingGoal.preferredTrainingDays ?? "未提供"}
- 不可訓練日期：${trainingGoal.unavailableDates ?? "未提供"}
- 傷痛說明：${trainingGoal.injuryNote ?? "未提供"}
- 疲勞狀態：${trainingGoal.fatigueLevel ?? "未提供"}

最近對話：
${history || "尚未開始對話。"}

傷痛狀態判讀提示：
${painStatus}

對話規則：
1. 不要產生完整每日課表；正式課表仍需由後續「依對話產生課表」流程建立。
2. 每次最多問 1 到 3 個關鍵問題。
3. 不要只因句子包含「疼痛」兩字就判定 high_risk；若語意是「沒有疼痛」或「沒有受傷」，請視為已回答傷痛狀態。
4. 若使用者已回答沒有疼痛、沒有受傷或已清楚描述輕微不適，不要在 assistantMessage、missingInformation 或 suggestedNextQuestion 中重複追問疼痛。
5. 只有在使用者描述劇痛、刺痛、腫脹、麻木、無力、疼痛加劇、胸悶、頭暈、呼吸困難或急性受傷時，readiness 才使用 high_risk，並提醒降低強度或尋求專業協助。
6. 若仍缺少目前週跑量、每週可安排訓練日上限、目標日期等核心資訊，readiness 請使用 needs_more_info；missingInformation 不可列出已由既有資料或對話回答過的項目。
7. 「每週可安排訓練日上限」是使用者一個日曆週最多能安排的訓練日數，不包含 rest 休息日，也不是必須排滿的目標；整理 collectedFacts.weeklyAvailability 或提供簡易預覽時必須沿用此定義。
8. 若資訊足夠產生保守且合理的課表，readiness 請使用 ready_to_generate。
9. 若使用者要求「查看目前課表規劃」、「先看大概」、「目前會怎麼排」、「給我一版簡易內容」等預覽需求，且 readiness 可判斷為 ready_to_generate，assistantMessage 可以先提供一版簡易預覽。
10. 簡易預覽必須明確標示「這只是簡易預覽，尚未寫入正式課表」，內容限於訓練重點、每週結構、關鍵課表類型、長跑或恢復安排方向與必要風險提醒；不得列出完整每日課表、不得宣稱已建立正式課表。
11. 若使用者要求預覽但核心資訊仍不足，請不要編造課表；readiness 使用 needs_more_info，並只追問最關鍵缺口。
12. 不得宣稱醫療診斷，不得保證完賽或 PB。
13. collectedFacts 請整理目前已知事實，不確定就填 null。
14. assistantMessage、missingInformation、riskWarnings、suggestedNextQuestion 與 collectedFacts 內的所有文字必須使用繁體中文，不得夾雜英文句子；只有使用者原文、品牌名稱、配速單位或必要專有名詞可保留英文。
15. assistantMessage 請直接給使用者閱讀，語氣清楚簡短；優先追問尚未回答的非疼痛核心資料。
16. assistantMessage 應帶有適度情緒價值：先用一句話承接使用者的目標、努力或擔心，讓使用者感覺被理解，再提出問題或結論。
17. 語氣要像專業但溫暖的跑步教練：可以使用「我理解」、「這樣安排會比較穩」、「你已經提供了很有用的資訊」這類自然表達，但不要過度熱情、空泛稱讚、賣弄鼓勵或像心理諮商。
18. 若需要提醒風險，先肯定使用者願意說明身體狀態，再清楚說明保守處理原因；不能因語氣溫和而弱化安全提醒。`;
}

export async function continueTrainingPlanConversation(
  input: PlanningConversationAgentInput
): Promise<PlanningConversationAgentResult> {
  const client = getOpenAIClient();
  const model = getOpenAIModel();
  const promptSnapshot = buildConversationPrompt(input);

  const response = await client.beta.chat.completions.parse({
    model,
    messages: [
      {
        role: "system",
        content:
          "你是保守且重視風險控管的跑步訓練規劃對話助理，也要像專業但溫暖的跑步教練。請追問必要資訊、整理已知事實與風險，不要輸出完整訓練課表；若使用者要求先看目前規劃且資料已足夠，可提供簡短粗略預覽，但必須說明尚未寫入正式課表。回覆時先簡短承接使用者的目標、努力或擔心，再提出下一步問題或結論。所有使用者可見文字必須使用繁體中文，schema enum/code 不需翻譯。"
      },
      {
        role: "user",
        content: promptSnapshot
      }
    ],
    response_format: zodResponseFormat(
      aiPlanningConversationSchema,
      "planning_conversation"
    )
  });

  const result = response.choices[0]?.message.parsed;

  if (!result) {
    throw new Error("Failed to parse planning conversation response.");
  }

  return {
    aiModel: model,
    result,
    promptSnapshot
  };
}
