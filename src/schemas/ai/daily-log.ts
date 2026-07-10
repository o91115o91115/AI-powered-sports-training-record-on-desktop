import { z } from "zod";

export const dailyLogInputSchema = z.object({
  text: z.string().trim().min(1),
  logDate: z.string().optional()
});

export const parsedDailyLogSchema = z.object({
  workout: z
    .object({
      workoutType: z.string().nullable(),
      distanceKm: z.number().min(0).nullable(),
      durationMin: z.number().int().min(0).nullable(),
      pace: z.string().nullable(),
      fatigueScore: z.number().int().min(1).max(10).nullable(),
      painLocation: z.string().nullable(),
      painScore: z.number().int().min(0).max(10).nullable(),
      completionStatus: z
        .enum(["completed", "partial", "missed", "changed", "rest"])
        .nullable()
    })
    .nullable(),
  nutrition: z
    .object({
      mealType: z
        .enum([
          "breakfast",
          "lunch",
          "dinner",
          "pre_workout",
          "post_workout",
          "fuel",
          "snack",
          "other"
        ])
        .nullable(),
      foodItems: z.array(z.string()),
      estimatedCarbsG: z
        .number()
        .min(0)
        .nullable()
        .describe("餐點碳水化合物克數粗估；有明確食物時請盡量依一般份量估算。"),
      estimatedProteinG: z
        .number()
        .min(0)
        .nullable()
        .describe("餐點蛋白質克數粗估；有明確食物時請盡量依一般份量估算。"),
      estimatedCalories: z
        .number()
        .min(0)
        .nullable()
        .describe("餐點熱量 kcal 粗估；有明確食物時請盡量依一般份量估算。"),
      estimateNote: z
        .string()
        .describe("說明營養數字為粗估，並列出份量或食物判斷的主要假設。")
    })
    .nullable(),
  missingInformation: z.array(z.string()),
  safetyNote: z.string().nullable()
});

export type DailyLogInput = z.infer<typeof dailyLogInputSchema>;
export type ParsedDailyLog = z.infer<typeof parsedDailyLogSchema>;
