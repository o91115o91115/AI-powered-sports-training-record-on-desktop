import type { AiPlanAdjustmentConversation } from "@/schemas/ai/replanning";

const topicPatterns: Array<{ id: string; pattern: RegExp }> = [
  { id: "pain", pattern: /腳痛|疼痛|痛感|不適|傷勢/ },
  { id: "pain_severity", pattern: /嚴重|程度|分數|頻率|影響|加劇|減輕|趨勢/ },
  { id: "treatment", pattern: /治療|就醫|診斷|醫療|專業協助/ },
  { id: "fatigue", pattern: /疲勞|疲累|體力|恢復狀態/ },
  { id: "cross_training", pattern: /交叉訓練|低衝擊|游泳|腳踏車|單車/ },
  { id: "willingness", pattern: /願意|接受|可以|能否|是否/ },
  { id: "start_date", pattern: /何時開始|哪一天|日期|立即|今天開始|明天開始/ },
  { id: "schedule", pattern: /行程|時間限制|可訓練|星期|週幾/ },
  { id: "training_change", pattern: /跑量|強度|休息|減量|增加|移動|調整目標/ }
];

export const getMeaningfulAdjustmentText = (value: string | null | undefined) => {
  const text = value?.trim() ?? "";

  // 排除斜線、標點或其他沒有實際語意的 LLM 佔位輸出。
  return /[\p{L}\p{N}]/u.test(text) ? text : null;
};

const getQuestionTopics = (value: string) =>
  new Set(
    topicPatterns
      .filter(({ pattern }) => pattern.test(value))
      .map(({ id }) => id)
  );

export const isRepeatedAdjustmentQuestion = (
  currentQuestion: string,
  previousQuestion: string
) => {
  const current = getMeaningfulAdjustmentText(currentQuestion);
  const previous = getMeaningfulAdjustmentText(previousQuestion);

  if (!current || !previous) return false;

  const compactCurrent = current.replace(/[\s，。！？、；：,.!?;:]/g, "");
  const compactPrevious = previous.replace(/[\s，。！？、；：,.!?;:]/g, "");

  if (
    compactCurrent.includes(compactPrevious) ||
    compactPrevious.includes(compactCurrent)
  ) {
    return true;
  }

  const currentTopics = getQuestionTopics(current);
  const previousTopics = getQuestionTopics(previous);
  const sharedTopics = [...currentTopics].filter((topic) => previousTopics.has(topic));
  const allTopics = new Set([...currentTopics, ...previousTopics]);

  return sharedTopics.length >= 2 && sharedTopics.length / allTopics.size >= 0.5;
};

const uniqueMeaningfulTexts = (values: string[]) =>
  [...new Set(values.map(getMeaningfulAdjustmentText).filter((value): value is string => Boolean(value)))];

export const normalizePlanAdjustmentConversation = (
  result: AiPlanAdjustmentConversation,
  previousStates: AiPlanAdjustmentConversation[]
): AiPlanAdjustmentConversation => {
  const adjustmentSummary = getMeaningfulAdjustmentText(result.adjustmentSummary);
  const riskWarnings = uniqueMeaningfulTexts(result.riskWarnings);
  const missingInformation = uniqueMeaningfulTexts(result.missingInformation);
  const suggestedNextQuestion = getMeaningfulAdjustmentText(result.suggestedNextQuestion);
  const previousQuestions = previousStates
    .map((state) => getMeaningfulAdjustmentText(state.suggestedNextQuestion))
    .filter((question): question is string => Boolean(question));
  const repeatedQuestion = Boolean(
    suggestedNextQuestion &&
      previousQuestions.some((question) =>
        isRepeatedAdjustmentQuestion(suggestedNextQuestion, question)
      )
  );

  if (!repeatedQuestion) {
    return {
      ...result,
      adjustmentSummary,
      assistantMessage:
        getMeaningfulAdjustmentText(result.assistantMessage) ??
        "我理解你希望調整接下來的訓練，我們可以再確認一個關鍵方向。",
      missingInformation,
      riskWarnings,
      suggestedNextQuestion
    };
  }

  const summaryText = adjustmentSummary
    ? `我理解你的調整重點是：${adjustmentSummary.replace(/[。！？]+$/g, "")}`
    : "我理解你希望在不增加身體負擔的前提下，調整接下來的訓練";
  const safetyText = riskWarnings.length
    ? "我會優先採用降載、恢復與低衝擊安排，並保留必要的安全提醒。"
    : "我會依照目前已確認的方向做保守調整。";

  // 若模型重複已問過的主題，直接收斂為可確認狀態，避免使用者反覆回答。
  return {
    ...result,
    adjustmentSummary,
    assistantMessage: `${summaryText}。你已經把關鍵感受和方向說得很清楚，我不會再請你重複回答相同問題。${safetyText}如果這符合你的想法，可以按「確認產生新版本」。`,
    readiness: riskWarnings.length || result.readiness === "high_risk"
      ? "high_risk"
      : "ready_to_generate",
    missingInformation: [],
    riskWarnings,
    suggestedNextQuestion: null
  };
};
