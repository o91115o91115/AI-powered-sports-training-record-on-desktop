import { z } from "zod";

import { aiTrainingPlanDraftSchema } from "@/schemas/ai/training-plan";

export const replanRequestSchema = z.object({
  trainingPlanId: z.string().min(1),
  adjustmentRequest: z.string().trim().min(5, "請輸入至少 5 個字的調整需求。")
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

export type ReplanRequest = z.infer<typeof replanRequestSchema>;
export type AiPlanAdjustmentDraft = z.infer<typeof aiPlanAdjustmentDraftSchema>;
