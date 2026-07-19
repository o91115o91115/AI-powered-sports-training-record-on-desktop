import { z } from "zod";

import { aiTrainingPlanDraftSchema } from "@/schemas/ai/training-plan";

export const planAdjustmentChatRequestSchema = z.object({
  trainingPlanId: z.string().min(1),
  conversationId: z.string().min(1).nullable(),
  feedbackId: z.string().min(1).nullable().optional(),
  userMessage: z.string().trim().min(1, "請輸入想調整的方向。").max(2000)
});

export const generatePlanAdjustmentRequestSchema = z.object({
  trainingPlanId: z.string().min(1),
  conversationId: z.string().min(1)
});

export const aiPlanAdjustmentConversationSchema = z.object({
  assistantMessage: z.string().min(1),
  readiness: z.enum(["needs_more_info", "ready_to_generate", "high_risk"]),
  missingInformation: z.array(z.string()),
  adjustmentSummary: z.string().nullable(),
  riskWarnings: z.array(z.string()),
  suggestedNextQuestion: z.string().nullable()
});

export const aiPlanAdjustmentDraftSchema = z.object({
  reasonType: z
    .enum(["fatigue", "pain", "missed_workout", "nutrition", "schedule", "performance", "other"])
    .describe("主要調整原因。"),
  reasonDescription: z.string().min(1).describe("為什麼需要調整計畫。"),
  affectedDates: z.array(z.string()).describe("受影響日期，格式 YYYY-MM-DD。"),
  beforeSummary: z.string().min(1).describe("原計畫重點摘要。"),
  afterSummary: z.string().min(1).describe("調整後計畫重點摘要。"),
  adjustedPlan: aiTrainingPlanDraftSchema.describe(
    "LLM 可只回傳需要調整的日期，後端會以 active version 完整日期為基底合併。若回傳完整計畫也可。"
  )
});

export type AiPlanAdjustmentConversation = z.infer<
  typeof aiPlanAdjustmentConversationSchema
>;
export type AiPlanAdjustmentDraft = z.infer<typeof aiPlanAdjustmentDraftSchema>;
