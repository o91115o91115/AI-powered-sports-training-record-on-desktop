import { z } from "zod";

export const dailyLogInputSchema = z.object({
  text: z.string().min(1),
  logDate: z.string().optional()
});

export const parsedDailyLogSchema = z.object({
  workout: z
    .object({
      workoutType: z.string().nullable(),
      distanceKm: z.number().nullable(),
      durationMin: z.number().int().nullable(),
      pace: z.string().nullable(),
      fatigueScore: z.number().int().min(1).max(10).nullable(),
      painLocation: z.string().nullable(),
      painScore: z.number().int().min(0).max(10).nullable(),
      completionStatus: z.string().nullable()
    })
    .nullable(),
  nutrition: z
    .object({
      mealType: z.string().nullable(),
      foodItems: z.array(z.string()),
      estimatedCarbsG: z.number().nullable(),
      estimatedProteinG: z.number().nullable(),
      estimatedCalories: z.number().nullable(),
      estimateNote: z.string()
    })
    .nullable(),
  missingInformation: z.array(z.string()),
  safetyNote: z.string().nullable()
});

export type DailyLogInput = z.infer<typeof dailyLogInputSchema>;
export type ParsedDailyLog = z.infer<typeof parsedDailyLogSchema>;
