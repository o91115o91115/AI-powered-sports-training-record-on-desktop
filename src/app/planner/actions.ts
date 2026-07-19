"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import {
  type TrainingDayFormValues,
  type TrainingPlanFormValues,
  type TrainingPlanVersionFormValues,
  trainingDayFormSchema,
  trainingPlanFormSchema,
  trainingPlanVersionFormSchema
} from "@/schemas/forms/training-plan";

export type PlannerActionResult = {
  ok: boolean;
  message: string;
};

export type TrainingPlanVersionDetailsResult =
  | {
      ok: true;
      trainingDays: Array<{
        id: string;
        date: string;
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
      }>;
    }
  | { ok: false; message: string };

export async function getTrainingPlanVersionDetails(
  trainingPlanVersionId: string
): Promise<TrainingPlanVersionDetailsResult> {
  if (!trainingPlanVersionId.trim()) {
    return { ok: false, message: "缺少訓練計畫版本，請重新選擇版本。" };
  }

  try {
    const profile = await prisma.userProfile.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { id: true }
    });

    if (!profile) {
      return { ok: false, message: "尚未建立使用者資料，無法讀取計畫內容。" };
    }

    // 僅在使用者展開版本時讀取每日內容，避免首頁一次載入所有明細。
    const version = await prisma.trainingPlanVersion.findFirst({
      where: {
        id: trainingPlanVersionId,
        trainingPlan: { userProfileId: profile.id }
      },
      select: {
        trainingDays: {
          include: { nutritionSuggestion: true },
          orderBy: { date: "asc" }
        }
      }
    });

    if (!version) {
      return { ok: false, message: "找不到此訓練計畫版本，請重新整理頁面。" };
    }

    return {
      ok: true,
      trainingDays: version.trainingDays.map((day) => ({
        id: day.id,
        date: day.date.toISOString().slice(0, 10),
        trainingType: day.trainingType,
        targetDistanceKm: day.targetDistanceKm,
        targetDurationMin: day.targetDurationMin,
        targetPace: day.targetPace,
        targetIntensity: day.targetIntensity,
        description: day.description,
        notes: day.notes,
        recoverySuggestion: day.recoverySuggestion,
        nutritionSuggestion: day.nutritionSuggestion
          ? {
              carbSuggestion: day.nutritionSuggestion.carbSuggestion,
              proteinSuggestion: day.nutritionSuggestion.proteinSuggestion,
              hydrationSuggestion: day.nutritionSuggestion.hydrationSuggestion,
              preWorkoutSuggestion: day.nutritionSuggestion.preWorkoutSuggestion,
              postWorkoutSuggestion: day.nutritionSuggestion.postWorkoutSuggestion,
              longRunFuelSuggestion: day.nutritionSuggestion.longRunFuelSuggestion,
              restDaySuggestion: day.nutritionSuggestion.restDaySuggestion,
              estimateNote: day.nutritionSuggestion.estimateNote
            }
          : null
      }))
    };
  } catch {
    return {
      ok: false,
      message: "目前無法讀取此版本內容，請稍後再試。"
    };
  }
}

const toNullableText = (value?: string) => {
  const text = value?.trim();
  return text ? text : null;
};

const toNullableNumber = (value?: string) => {
  const text = value?.trim();
  return text ? Number(text) : null;
};

const toNullableInt = (value?: string) => {
  const text = value?.trim();
  return text ? Number.parseInt(text, 10) : null;
};

const toNullableDate = (value?: string) => {
  const text = value?.trim();
  return text ? new Date(text) : null;
};

const revalidatePlannerViews = () => {
  revalidatePath("/planner");
  revalidatePath("/calendar");
};

async function ensureDraftVersion(trainingPlanVersionId: string) {
  const version = await prisma.trainingPlanVersion.findUnique({
    where: { id: trainingPlanVersionId },
    select: { status: true }
  });

  if (!version) {
    throw new Error("version_not_found");
  }

  if (version.status !== "draft") {
    throw new Error("version_not_draft");
  }
}

export async function createTrainingPlan(
  values: TrainingPlanFormValues
): Promise<PlannerActionResult> {
  const parsed = trainingPlanFormSchema.safeParse(values);

  if (!parsed.success) {
    return {
      ok: false,
      message: "訓練計畫資料不完整，請確認必填欄位與日期格式。"
    };
  }

  const data = parsed.data;

  try {
    await prisma.trainingPlan.create({
      data: {
        userProfileId: data.userProfileId,
        trainingGoalId: toNullableText(data.trainingGoalId),
        title: data.title.trim(),
        status: "draft",
        startDate: toNullableDate(data.startDate),
        endDate: toNullableDate(data.endDate)
      }
    });

    revalidatePlannerViews();

    return {
      ok: true,
      message: "訓練計畫草稿已建立。"
    };
  } catch {
    return {
      ok: false,
      message: "訓練計畫建立失敗，請確認已完成使用者資料與目標設定。"
    };
  }
}

export async function archiveTrainingPlan(
  trainingPlanId: string
): Promise<PlannerActionResult> {
  try {
    await prisma.trainingPlan.update({
      where: { id: trainingPlanId },
      data: {
        status: "archived",
        activeVersionId: null
      }
    });

    revalidatePlannerViews();

    return {
      ok: true,
      message: "訓練計畫已封存。"
    };
  } catch {
    return {
      ok: false,
      message: "訓練計畫封存失敗。"
    };
  }
}

export async function createTrainingPlanVersion(
  values: TrainingPlanVersionFormValues
): Promise<PlannerActionResult> {
  const parsed = trainingPlanVersionFormSchema.safeParse(values);

  if (!parsed.success) {
    return {
      ok: false,
      message: "版本資料不完整，請輸入版本摘要。"
    };
  }

  const data = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      const latestVersion = await tx.trainingPlanVersion.findFirst({
        where: { trainingPlanId: data.trainingPlanId },
        orderBy: { versionNumber: "desc" },
        select: { versionNumber: true }
      });

      await tx.trainingPlanVersion.create({
        data: {
          trainingPlanId: data.trainingPlanId,
          versionNumber: (latestVersion?.versionNumber ?? 0) + 1,
          status: "draft",
          summary: data.summary.trim()
        }
      });
    });

    revalidatePlannerViews();

    return {
      ok: true,
      message: "計畫版本草稿已建立。"
    };
  } catch {
    return {
      ok: false,
      message: "計畫版本建立失敗。"
    };
  }
}

export async function confirmTrainingPlanVersion(
  trainingPlanId: string,
  trainingPlanVersionId: string
): Promise<PlannerActionResult> {
  try {
    await prisma.$transaction(async (tx) => {
      const version = await tx.trainingPlanVersion.findFirst({
        where: {
          id: trainingPlanVersionId,
          trainingPlanId
        },
        select: { id: true }
      });

      if (!version) {
        throw new Error("version_not_found");
      }

      await tx.trainingPlanVersion.update({
        where: { id: trainingPlanVersionId },
        data: {
          status: "confirmed",
          confirmedAt: new Date()
        }
      });

      await tx.trainingPlan.update({
        where: { id: trainingPlanId },
        data: {
          status: "active",
          activeVersionId: trainingPlanVersionId
        }
      });
    });

    revalidatePlannerViews();

    return {
      ok: true,
      message: "計畫版本已確認並套用。"
    };
  } catch {
    return {
      ok: false,
      message: "計畫版本套用失敗。"
    };
  }
}

export async function archiveTrainingPlanVersion(
  trainingPlanVersionId: string
): Promise<PlannerActionResult> {
  try {
    await prisma.trainingPlanVersion.update({
      where: { id: trainingPlanVersionId },
      data: { status: "archived" }
    });

    revalidatePlannerViews();

    return {
      ok: true,
      message: "計畫版本已封存。"
    };
  } catch {
    return {
      ok: false,
      message: "計畫版本封存失敗。"
    };
  }
}

export async function saveTrainingDay(
  values: TrainingDayFormValues
): Promise<PlannerActionResult> {
  const parsed = trainingDayFormSchema.safeParse(values);

  if (!parsed.success) {
    return {
      ok: false,
      message: "每日訓練資料不完整，請確認日期、類型與數值格式。"
    };
  }

  const data = parsed.data;

  try {
    await ensureDraftVersion(data.trainingPlanVersionId);

    await prisma.$transaction(async (tx) => {
      const trainingDayData = {
        trainingPlanVersionId: data.trainingPlanVersionId,
        date: new Date(data.date),
        trainingType: data.trainingType,
        targetDistanceKm: toNullableNumber(data.targetDistanceKm),
        targetDurationMin: toNullableInt(data.targetDurationMin),
        targetPace: toNullableText(data.targetPace),
        targetIntensity: toNullableText(data.targetIntensity),
        description: toNullableText(data.description),
        notes: toNullableText(data.notes),
        recoverySuggestion: toNullableText(data.recoverySuggestion),
        completionStatus: "planned"
      };

      const trainingDay = data.trainingDayId
        ? await tx.trainingDay.update({
            where: { id: data.trainingDayId },
            data: trainingDayData
          })
        : await tx.trainingDay.create({ data: trainingDayData });

      await tx.nutritionSuggestion.upsert({
        where: { trainingDayId: trainingDay.id },
        create: {
          trainingDayId: trainingDay.id,
          carbSuggestion: toNullableText(data.carbSuggestion),
          proteinSuggestion: toNullableText(data.proteinSuggestion),
          hydrationSuggestion: toNullableText(data.hydrationSuggestion),
          preWorkoutSuggestion: toNullableText(data.preWorkoutSuggestion),
          postWorkoutSuggestion: toNullableText(data.postWorkoutSuggestion),
          longRunFuelSuggestion: toNullableText(data.longRunFuelSuggestion),
          restDaySuggestion: toNullableText(data.restDaySuggestion),
          estimateNote: toNullableText(data.estimateNote)
        },
        update: {
          carbSuggestion: toNullableText(data.carbSuggestion),
          proteinSuggestion: toNullableText(data.proteinSuggestion),
          hydrationSuggestion: toNullableText(data.hydrationSuggestion),
          preWorkoutSuggestion: toNullableText(data.preWorkoutSuggestion),
          postWorkoutSuggestion: toNullableText(data.postWorkoutSuggestion),
          longRunFuelSuggestion: toNullableText(data.longRunFuelSuggestion),
          restDaySuggestion: toNullableText(data.restDaySuggestion),
          estimateNote: toNullableText(data.estimateNote)
        }
      });
    });

    revalidatePlannerViews();

    return {
      ok: true,
      message: "每日訓練與營養建議已儲存。"
    };
  } catch (error) {
    if (error instanceof Error && error.message === "version_not_draft") {
      return {
        ok: false,
        message: "已確認或封存的版本不可直接修改，請先建立新版本。"
      };
    }

    return {
      ok: false,
      message: "每日訓練儲存失敗。"
    };
  }
}

export async function deleteTrainingDay(
  trainingDayId: string,
  trainingPlanVersionId: string
): Promise<PlannerActionResult> {
  try {
    await ensureDraftVersion(trainingPlanVersionId);
    await prisma.trainingDay.delete({
      where: { id: trainingDayId }
    });

    revalidatePlannerViews();

    return {
      ok: true,
      message: "每日訓練已刪除。"
    };
  } catch (error) {
    if (error instanceof Error && error.message === "version_not_draft") {
      return {
        ok: false,
        message: "已確認或封存的版本不可刪除內容，請先建立新版本。"
      };
    }

    return {
      ok: false,
      message: "每日訓練刪除失敗。"
    };
  }
}
