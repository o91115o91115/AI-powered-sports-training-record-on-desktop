import { z } from "zod";

export const trainingPlanRequestSchema = z.object({
  userProfileId: z.string().min(1),
  trainingGoalId: z.string().min(1).optional()
});

export const aiNutritionSuggestionSchema = z.object({
  carbSuggestion: z.string(),
  proteinSuggestion: z.string(),
  hydrationSuggestion: z.string(),
  preWorkoutSuggestion: z.string(),
  postWorkoutSuggestion: z.string(),
  longRunFuelSuggestion: z.string(),
  restDaySuggestion: z.string(),
  estimateNote: z.string()
});

export const aiTrainingDaySchema = z.object({
  date: z.string().min(1),
  trainingType: z.enum([
    "easy",
    "long_run",
    "tempo",
    "interval",
    "rest",
    "cross_training",
    "race"
  ]),
  targetDistanceKm: z.number().min(0).nullable(),
  targetDurationMin: z.number().int().min(0).nullable(),
  targetPace: z.string().nullable(),
  targetIntensity: z.string().nullable(),
  description: z.string(),
  notes: z.string(),
  recoverySuggestion: z.string(),
  nutritionSuggestion: aiNutritionSuggestionSchema
});

export const aiTrainingPlanDraftSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  trainingCycleSummary: z.string().min(1),
  safetyNotes: z.array(z.string()),
  riskWarnings: z.array(z.string()),
  missingInformation: z.array(z.string()),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  trainingDays: z.array(aiTrainingDaySchema).min(1)
});

export type TrainingPlanRequest = z.infer<typeof trainingPlanRequestSchema>;
export type AiTrainingPlanDraft = z.infer<typeof aiTrainingPlanDraftSchema>;
