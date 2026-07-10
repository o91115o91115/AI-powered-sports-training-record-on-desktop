import { z } from "zod";

export const reviewFeedbackInputSchema = z.object({
  userProfileId: z.string().min(1),
  trainingDayId: z.string().min(1)
});

export const reviewFeedbackSchema = z.object({
  summary: z.string().describe("今日整體回饋摘要。"),
  trainingAnalysis: z
    .string()
    .nullable()
    .describe("根據計畫與實際訓練紀錄分析完成度、強度與疲勞狀態。"),
  nutritionAnalysis: z
    .string()
    .nullable()
    .describe("根據當日飲食紀錄分析碳水、蛋白質、熱量與補給是否大致足夠。"),
  riskWarning: z
    .string()
    .nullable()
    .describe("疼痛、受傷、高疲勞或補給不足等風險提醒；不可做醫療診斷。"),
  nextStepSuggestion: z.string().describe("下一步可執行建議，需保守且可操作。"),
  shouldReplan: z
    .boolean()
    .describe("若高疲勞、疼痛、連續未完成或明顯偏離計畫，建議後續重新調整訓練計畫。"),
  missingInformation: z.array(z.string()).describe("不足以判斷時需要補充的資料。")
});

export type ReviewFeedbackInput = z.infer<typeof reviewFeedbackInputSchema>;
export type ReviewFeedback = z.infer<typeof reviewFeedbackSchema>;
