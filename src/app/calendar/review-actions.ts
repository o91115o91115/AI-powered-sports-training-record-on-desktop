"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { reviewFeedbackInputSchema } from "@/schemas/ai/review-feedback";
import { generateReviewFeedback } from "@/services/ai/review-agent";

export type ReviewFeedbackActionResult = {
  ok: boolean;
  message: string;
};

const toDateInput = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export async function generateDailyReviewFeedback(
  values: unknown
): Promise<ReviewFeedbackActionResult> {
  const parsed = reviewFeedbackInputSchema.safeParse(values);

  if (!parsed.success) {
    return {
      ok: false,
      message: "缺少產生回饋所需資料，請重新整理後再試一次。"
    };
  }

  const data = parsed.data;

  try {
    const trainingDay = await prisma.trainingDay.findUnique({
      where: { id: data.trainingDayId },
      include: {
        nutritionSuggestion: true,
        workoutLogs: {
          orderBy: { createdAt: "desc" },
          take: 1
        },
        foodLogs: {
          orderBy: { createdAt: "desc" }
        },
        trainingPlanVersion: {
          include: {
            trainingPlan: {
              include: {
                trainingGoal: true
              }
            }
          }
        }
      }
    });

    if (!trainingDay) {
      return {
        ok: false,
        message: "找不到對應的訓練日，請重新整理後再試一次。"
      };
    }

    const plan = trainingDay.trainingPlanVersion.trainingPlan;

    if (plan.userProfileId !== data.userProfileId) {
      return {
        ok: false,
        message: "此訓練日與目前使用者資料不一致，請重新整理後再試一次。"
      };
    }

    if (toDateInput(trainingDay.date) > toDateInput(new Date())) {
      return {
        ok: false,
        message: "未來日期尚未有實際紀錄，不可產生今日回饋。"
      };
    }

    const latestWorkoutLog = trainingDay.workoutLogs[0] ?? null;
    if (!latestWorkoutLog && trainingDay.foodLogs.length === 0) {
      return {
        ok: false,
        message: "目前沒有實際訓練或飲食紀錄，請先新增紀錄後再產生 AI 今日回饋。"
      };
    }

    const goalLabel = plan.trainingGoal
      ? `${plan.trainingGoal.targetDistance}${
          plan.trainingGoal.raceName ? ` / ${plan.trainingGoal.raceName}` : ""
        }`
      : "未提供目標";

    const { feedback, model, promptSnapshot } = await generateReviewFeedback({
      goalLabel,
      planSummary: trainingDay.trainingPlanVersion.summary,
      trainingDay: {
        date: toDateInput(trainingDay.date),
        trainingType: trainingDay.trainingType,
        targetDistanceKm: trainingDay.targetDistanceKm,
        targetDurationMin: trainingDay.targetDurationMin,
        targetPace: trainingDay.targetPace,
        targetIntensity: trainingDay.targetIntensity,
        description: trainingDay.description,
        recoverySuggestion: trainingDay.recoverySuggestion
      },
      workoutLog: latestWorkoutLog
        ? {
            rawInput: latestWorkoutLog.rawInput,
            workoutType: latestWorkoutLog.workoutType,
            distanceKm: latestWorkoutLog.distanceKm,
            durationMin: latestWorkoutLog.durationMin,
            pace: latestWorkoutLog.pace,
            fatigueScore: latestWorkoutLog.fatigueScore,
            painLocation: latestWorkoutLog.painLocation,
            painScore: latestWorkoutLog.painScore,
            completionStatus: latestWorkoutLog.completionStatus
          }
        : null,
      foodLogs: trainingDay.foodLogs.map((foodLog) => ({
        rawInput: foodLog.rawInput,
        mealType: foodLog.mealType,
        estimatedCarbsG: foodLog.estimatedCarbsG,
        estimatedProteinG: foodLog.estimatedProteinG,
        estimatedCalories: foodLog.estimatedCalories,
        estimateNote: foodLog.estimateNote
      }))
    });

    await prisma.aiFeedback.create({
      data: {
        userProfileId: data.userProfileId,
        workoutLogId: latestWorkoutLog?.id ?? null,
        foodLogId: trainingDay.foodLogs[0]?.id ?? null,
        feedbackType: "daily_review",
        summary: feedback.summary,
        trainingAnalysis: feedback.trainingAnalysis,
        nutritionAnalysis: feedback.nutritionAnalysis,
        riskWarning: feedback.riskWarning,
        nextStepSuggestion: feedback.nextStepSuggestion,
        shouldReplan: feedback.shouldReplan,
        aiModel: model,
        promptSnapshot
      }
    });

    revalidatePath("/calendar");
    revalidatePath("/dashboard");

    return {
      ok: true,
      message: "AI 今日回饋已產生。"
    };
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("OPENAI_API_KEY")
        ? "目前尚未完成 AI 服務設定，無法產生 AI 今日回饋。"
        : "AI 今日回饋產生失敗，請稍後再試。";

    return {
      ok: false,
      message
    };
  }
}
