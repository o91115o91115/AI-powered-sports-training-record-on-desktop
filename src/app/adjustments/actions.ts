"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { replanRequestSchema } from "@/schemas/ai/replanning";
import type { AiTrainingDay } from "@/schemas/ai/training-plan";
import { createPlanAdjustmentDraft } from "@/services/ai/replanning-agent";

export type AdjustmentActionResult = {
  ok: boolean;
  message: string;
};

type ActiveTrainingDay = {
  date: Date;
  trainingType: string;
  targetDistanceKm: number | null;
  targetDurationMin: number | null;
  targetPace: string | null;
  targetIntensity: string | null;
  description: string | null;
  notes: string | null;
  recoverySuggestion: string | null;
  nutritionSuggestion: {
    carbSuggestion: string | null;
    proteinSuggestion: string | null;
    hydrationSuggestion: string | null;
    preWorkoutSuggestion: string | null;
    postWorkoutSuggestion: string | null;
    longRunFuelSuggestion: string | null;
    restDaySuggestion: string | null;
    estimateNote: string | null;
  } | null;
};

const toDateInput = (value: Date | null | undefined) =>
  value ? value.toISOString().slice(0, 10) : "";

const toNullableDate = (value: string) => {
  const text = value.trim();
  return text ? new Date(text) : null;
};

const revalidateAdjustmentViews = () => {
  revalidatePath("/adjustments");
  revalidatePath("/planner");
  revalidatePath("/calendar");
};

const toAiTrainingDay = (day: ActiveTrainingDay): AiTrainingDay => ({
  date: toDateInput(day.date),
  trainingType: day.trainingType as AiTrainingDay["trainingType"],
  targetDistanceKm: day.targetDistanceKm,
  targetDurationMin: day.targetDurationMin,
  targetPace: day.targetPace,
  targetIntensity: day.targetIntensity,
  description: day.description ?? "",
  notes: day.notes ?? "",
  recoverySuggestion: day.recoverySuggestion ?? "",
  nutritionSuggestion: {
    carbSuggestion: day.nutritionSuggestion?.carbSuggestion ?? "",
    proteinSuggestion: day.nutritionSuggestion?.proteinSuggestion ?? "",
    hydrationSuggestion: day.nutritionSuggestion?.hydrationSuggestion ?? "",
    preWorkoutSuggestion: day.nutritionSuggestion?.preWorkoutSuggestion ?? "",
    postWorkoutSuggestion: day.nutritionSuggestion?.postWorkoutSuggestion ?? "",
    longRunFuelSuggestion: day.nutritionSuggestion?.longRunFuelSuggestion ?? "",
    restDaySuggestion: day.nutritionSuggestion?.restDaySuggestion ?? "",
    estimateNote: day.nutritionSuggestion?.estimateNote ?? ""
  }
});

const mergeAdjustedTrainingDays = (
  activeTrainingDays: ActiveTrainingDay[],
  adjustedTrainingDays: AiTrainingDay[]
) => {
  const activeDateSet = new Set(activeTrainingDays.map((day) => toDateInput(day.date)));
  const adjustedByDate = new Map<string, AiTrainingDay>();
  const outOfRangeDates: string[] = [];

  for (const day of adjustedTrainingDays) {
    if (!activeDateSet.has(day.date)) {
      outOfRangeDates.push(day.date);
      continue;
    }

    adjustedByDate.set(day.date, day);
  }

  if (outOfRangeDates.length > 0) {
    throw new Error(`adjusted_dates_out_of_range:${outOfRangeDates.join(",")}`);
  }

  // 以 active version 的完整日期為基底，只有 LLM 回傳的同日期內容才覆蓋。
  return activeTrainingDays.map((day) => {
    const date = toDateInput(day.date);
    return adjustedByDate.get(date) ?? toAiTrainingDay(day);
  });
};

export async function generatePlanAdjustmentDraft(
  values: unknown
): Promise<AdjustmentActionResult> {
  const parsed = replanRequestSchema.safeParse(values);

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "缺少訓練計畫資料，請重新整理後再試一次。"
    };
  }

  const { adjustmentRequest, trainingPlanId } = parsed.data;

  try {
    const plan = await prisma.trainingPlan.findUnique({
      where: { id: trainingPlanId },
      include: {
        trainingGoal: true,
        versions: {
          include: {
            trainingDays: {
              include: { nutritionSuggestion: true },
              orderBy: { date: "asc" }
            }
          },
          orderBy: { versionNumber: "desc" }
        },
        userProfile: {
          include: {
            workoutLogs: {
              orderBy: { logDate: "desc" },
              take: 14
            },
            foodLogs: {
              orderBy: { logDate: "desc" },
              take: 14
            },
            aiFeedback: {
              where: { feedbackType: "daily_review" },
              orderBy: { createdAt: "desc" },
              take: 5
            }
          }
        }
      }
    });

    if (!plan || !plan.activeVersionId) {
      return {
        ok: false,
        message: "目前沒有可調整的 active 訓練計畫版本。"
      };
    }

    const activeVersion = plan.versions.find((version) => version.id === plan.activeVersionId);

    if (!activeVersion) {
      return {
        ok: false,
        message: "找不到目前啟用中的訓練計畫版本。"
      };
    }

    const goalLabel = plan.trainingGoal
      ? `${plan.trainingGoal.targetDistance}${
          plan.trainingGoal.raceName ? ` / ${plan.trainingGoal.raceName}` : ""
        }`
      : "未提供目標";

    const result = await createPlanAdjustmentDraft({
      adjustmentRequest,
      plan: {
        title: plan.title,
        goalLabel,
        startDate: toDateInput(plan.startDate),
        endDate: toDateInput(plan.endDate),
        activeVersionSummary: activeVersion.summary
      },
      activeTrainingDays: activeVersion.trainingDays.map((day) => ({
        date: toDateInput(day.date),
        trainingType: day.trainingType,
        targetDistanceKm: day.targetDistanceKm,
        targetDurationMin: day.targetDurationMin,
        targetPace: day.targetPace,
        targetIntensity: day.targetIntensity,
        description: day.description,
        recoverySuggestion: day.recoverySuggestion
      })),
      recentWorkoutLogs: plan.userProfile.workoutLogs.map((log) => ({
        logDate: toDateInput(log.logDate),
        rawInput: log.rawInput,
        distanceKm: log.distanceKm,
        durationMin: log.durationMin,
        fatigueScore: log.fatigueScore,
        painLocation: log.painLocation,
        painScore: log.painScore,
        completionStatus: log.completionStatus
      })),
      recentFoodLogs: plan.userProfile.foodLogs.map((log) => ({
        logDate: toDateInput(log.logDate),
        rawInput: log.rawInput,
        estimatedCarbsG: log.estimatedCarbsG,
        estimatedProteinG: log.estimatedProteinG,
        estimatedCalories: log.estimatedCalories
      })),
      recentFeedback: plan.userProfile.aiFeedback.map((feedback) => ({
        summary: feedback.summary,
        trainingAnalysis: feedback.trainingAnalysis,
        nutritionAnalysis: feedback.nutritionAnalysis,
        riskWarning: feedback.riskWarning,
        nextStepSuggestion: feedback.nextStepSuggestion,
        shouldReplan: feedback.shouldReplan
      }))
    });

    const mergedTrainingDays = mergeAdjustedTrainingDays(
      activeVersion.trainingDays,
      result.draft.adjustedPlan.trainingDays
    );

    if (mergedTrainingDays.length !== activeVersion.trainingDays.length) {
      return {
        ok: false,
        message: "AI 調整草稿日期不完整，請重新產生。"
      };
    }

    await prisma.$transaction(async (tx) => {
      const latestVersion = await tx.trainingPlanVersion.findFirst({
        where: { trainingPlanId },
        orderBy: { versionNumber: "desc" },
        select: { versionNumber: true }
      });

      const newVersion = await tx.trainingPlanVersion.create({
        data: {
          trainingPlanId,
          versionNumber: (latestVersion?.versionNumber ?? 0) + 1,
          status: "draft",
          summary: result.draft.adjustedPlan.summary,
          aiModel: result.aiModel,
          promptSnapshot: result.promptSnapshot
        },
        select: { id: true }
      });

      for (const day of mergedTrainingDays) {
        const trainingDay = await tx.trainingDay.create({
          data: {
            trainingPlanVersionId: newVersion.id,
            date: new Date(day.date),
            trainingType: day.trainingType,
            targetDistanceKm: day.targetDistanceKm,
            targetDurationMin: day.targetDurationMin,
            targetPace: day.targetPace,
            targetIntensity: day.targetIntensity,
            description: day.description,
            notes: day.notes,
            recoverySuggestion: day.recoverySuggestion,
            completionStatus: "planned"
          },
          select: { id: true }
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

      await tx.planAdjustment.create({
        data: {
          trainingPlanVersionId: activeVersion.id,
          newTrainingPlanVersionId: newVersion.id,
          reasonType: result.draft.reasonType,
          reasonDescription: result.draft.reasonDescription,
          affectedDates: JSON.stringify(result.draft.affectedDates),
          beforeSummary: result.draft.beforeSummary,
          afterSummary: result.draft.afterSummary,
          status: "draft",
          aiModel: result.aiModel,
          promptSnapshot: result.promptSnapshot
        }
      });

      await tx.trainingPlan.update({
        where: { id: trainingPlanId },
        data: {
          startDate: toNullableDate(result.draft.adjustedPlan.startDate),
          endDate: toNullableDate(result.draft.adjustedPlan.endDate)
        }
      });
    });

    revalidateAdjustmentViews();

    return {
      ok: true,
      message: "AI 計畫調整草稿已產生，未調整日期已保留原計畫內容。"
    };
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("OPENAI_API_KEY")
        ? "目前尚未完成 AI 服務設定，無法產生計畫調整草稿。"
        : error instanceof Error && error.message.startsWith("adjusted_dates_out_of_range")
          ? "AI 回傳了不在目前訓練區間內的日期，請重新產生調整草稿。"
          : "計畫調整草稿產生失敗，請稍後再試。";

    return {
      ok: false,
      message
    };
  }
}

export async function confirmPlanAdjustment(
  planAdjustmentId: string
): Promise<AdjustmentActionResult> {
  try {
    const adjustment = await prisma.planAdjustment.findUnique({
      where: { id: planAdjustmentId },
      include: {
        originalVersion: {
          select: {
            trainingPlan: {
              select: { status: true }
            },
            trainingPlanId: true
          }
        },
        newVersion: {
          select: { id: true }
        }
      }
    });

    if (!adjustment?.newVersion) {
      return {
        ok: false,
        message: "找不到要啟用的調整版本，請重新整理後再試一次。"
      };
    }

    if (adjustment.originalVersion.trainingPlan.status === "archived") {
      return {
        ok: false,
        message: "此訓練計畫已封存，不能再啟用調整版本。"
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.trainingPlanVersion.update({
        where: { id: adjustment.newVersion!.id },
        data: {
          status: "confirmed",
          confirmedAt: new Date()
        }
      });

      await tx.trainingPlan.update({
        where: { id: adjustment.originalVersion.trainingPlanId },
        data: {
          status: "active",
          activeVersionId: adjustment.newVersion!.id
        }
      });

      await tx.planAdjustment.update({
        where: { id: planAdjustmentId },
        data: {
          status: "confirmed",
          confirmedAt: new Date()
        }
      });
    });

    revalidateAdjustmentViews();

    return {
      ok: true,
      message: "計畫調整已確認，新版本已啟用。"
    };
  } catch {
    return {
      ok: false,
      message: "計畫調整確認失敗，請稍後再試。"
    };
  }
}
