"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { createTrainingPlanDraft } from "@/services/ai/planning-agent";

export type GenerateAiPlanDraftResult = {
  ok: boolean;
  message: string;
};

const getRequiredPlannerContext = async () => {
  const userProfile = await prisma.userProfile.findFirst({
    include: {
      trainingGoals: {
        orderBy: { updatedAt: "desc" },
        take: 1
      }
    },
    orderBy: { updatedAt: "desc" }
  });

  if (!userProfile) {
    throw new Error("missing_profile");
  }

  const trainingGoal = userProfile.trainingGoals[0];

  if (!trainingGoal) {
    throw new Error("missing_goal");
  }

  return { trainingGoal, userProfile };
};

const parseAiDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("invalid_ai_date");
  }

  return date;
};

export async function generateAiTrainingPlanDraft(): Promise<GenerateAiPlanDraftResult> {
  try {
    const { trainingGoal, userProfile } = await getRequiredPlannerContext();

    if (!trainingGoal.currentWeeklyMileageKm || !trainingGoal.weeklyTrainingDays) {
      return {
        ok: false,
        message: "目前訓練資料不足，請先補上目前週跑量與每週可訓練天數。"
      };
    }

    const aiResult = await createTrainingPlanDraft({
      trainingGoal,
      userProfile
    });

    await prisma.$transaction(async (tx) => {
      const plan = await tx.trainingPlan.create({
        data: {
          userProfileId: userProfile.id,
          trainingGoalId: trainingGoal.id,
          title: aiResult.draft.title,
          status: "draft",
          startDate: parseAiDate(aiResult.draft.startDate),
          endDate: parseAiDate(aiResult.draft.endDate)
        }
      });

      const version = await tx.trainingPlanVersion.create({
        data: {
          trainingPlanId: plan.id,
          versionNumber: 1,
          status: "draft",
          summary: `${aiResult.draft.summary}\n\n${aiResult.draft.trainingCycleSummary}`,
          aiModel: aiResult.aiModel,
          promptSnapshot: aiResult.promptSnapshot
        }
      });

      for (const day of aiResult.draft.trainingDays) {
        const trainingDay = await tx.trainingDay.create({
          data: {
            trainingPlanVersionId: version.id,
            date: parseAiDate(day.date),
            trainingType: day.trainingType,
            targetDistanceKm: day.targetDistanceKm,
            targetDurationMin: day.targetDurationMin,
            targetPace: day.targetPace,
            targetIntensity: day.targetIntensity,
            description: day.description,
            notes: [day.notes, ...aiResult.draft.riskWarnings].filter(Boolean).join("\n"),
            recoverySuggestion: day.recoverySuggestion,
            completionStatus: "planned"
          }
        });

        await tx.nutritionSuggestion.create({
          data: {
            trainingDayId: trainingDay.id,
            carbSuggestion: day.nutritionSuggestion.carbSuggestion,
            proteinSuggestion: day.nutritionSuggestion.proteinSuggestion,
            hydrationSuggestion: day.nutritionSuggestion.hydrationSuggestion,
            preWorkoutSuggestion: day.nutritionSuggestion.preWorkoutSuggestion,
            postWorkoutSuggestion: day.nutritionSuggestion.postWorkoutSuggestion,
            longRunFuelSuggestion: day.nutritionSuggestion.longRunFuelSuggestion,
            restDaySuggestion: day.nutritionSuggestion.restDaySuggestion,
            estimateNote: day.nutritionSuggestion.estimateNote
          }
        });
      }
    });

    revalidatePath("/planner");
    revalidatePath("/calendar");

    const missingInfo = aiResult.draft.missingInformation.length
      ? ` AI 也標示仍需補充：${aiResult.draft.missingInformation.join("、")}。`
      : "";

    return {
      ok: true,
      message: `AI 訓練計畫草稿已建立，請確認內容後再套用。${missingInfo}`
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "missing_profile" || error.message === "missing_goal") {
        return {
          ok: false,
          message: "請先完成使用者基本資料與訓練目標，再產生 AI 計畫草稿。"
        };
      }

      if (error.message === "OPENAI_API_KEY is not configured.") {
        return {
          ok: false,
          message: "OpenAI API Key 尚未設定，無法產生 AI 計畫草稿。"
        };
      }

      if (error.message === "invalid_ai_date") {
        return {
          ok: false,
          message: "AI 回傳日期格式不正確，未寫入資料庫，請重新產生。"
        };
      }
    }

    return {
      ok: false,
      message: "AI 計畫草稿產生失敗，請稍後再試，或先補齊使用者目標資料。"
    };
  }
}
