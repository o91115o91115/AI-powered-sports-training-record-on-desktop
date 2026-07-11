import { z } from "zod";

export const aiPlanningConversationSchema = z.object({
  assistantMessage: z.string().min(1),
  readiness: z.enum(["needs_more_info", "ready_to_generate", "high_risk"]),
  missingInformation: z.array(z.string()),
  collectedFacts: z.object({
    goal: z.string().nullable(),
    currentFitness: z.string().nullable(),
    weeklyAvailability: z.string().nullable(),
    injuryOrPain: z.string().nullable(),
    fatigue: z.string().nullable(),
    preferences: z.string().nullable(),
    nutritionLimits: z.string().nullable()
  }),
  riskWarnings: z.array(z.string()),
  suggestedNextQuestion: z.string().nullable()
});

export type AiPlanningConversation = z.infer<typeof aiPlanningConversationSchema>;

export type PlanningConversationMessage = {
  role: "user" | "assistant";
  content: string;
};
