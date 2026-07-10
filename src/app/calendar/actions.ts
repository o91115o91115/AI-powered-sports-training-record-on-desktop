"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import {
  type FoodLogFormValues,
  foodLogFormSchema
} from "@/schemas/forms/food-log";
import {
  type WorkoutLogFormValues,
  workoutLogFormSchema
} from "@/schemas/forms/workout-log";

export type CalendarActionResult = {
  ok: boolean;
  message: string;
};

export type DeleteFoodLogValues = {
  foodLogId: string;
  userProfileId: string;
};

const toNullableText = (value?: string | null) => {
  const text = value?.trim();
  return text ? text : null;
};

const toNullableNumber = (value?: string | null) => {
  const text = value?.trim();
  return text ? Number(text) : null;
};

const toNullableInt = (value?: string | null) => {
  const text = value?.trim();
  return text ? Number.parseInt(text, 10) : null;
};

const toDateInput = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const buildWorkoutRawInput = (data: WorkoutLogFormValues) => {
  const note = data.rawInput?.trim();

  if (note) {
    return note;
  }

  return [
    `完成狀態：${data.completionStatus}`,
    data.distanceKm ? `實際距離：${data.distanceKm} km` : null,
    data.durationMin ? `實際時間：${data.durationMin} 分鐘` : null,
    data.pace ? `實際配速：${data.pace}` : null,
    data.fatigueScore ? `疲勞分數：${data.fatigueScore}` : null,
    data.painScore ? `疼痛分數：${data.painScore}` : null,
    data.painLocation ? `疼痛位置：${data.painLocation}` : null
  ]
    .filter(Boolean)
    .join("；");
};

async function getTrainingDayForWrite(trainingDayId: string) {
  return prisma.trainingDay.findUnique({
    where: { id: trainingDayId },
    include: {
      trainingPlanVersion: {
        include: {
          trainingPlan: {
            select: { userProfileId: true }
          }
        }
      }
    }
  });
}

function validateTrainingDayWrite(params: {
  trainingDay: Awaited<ReturnType<typeof getTrainingDayForWrite>>;
  userProfileId: string;
  logDate: string;
  recordName: string;
}): CalendarActionResult | null {
  const { trainingDay, userProfileId, logDate, recordName } = params;

  if (!trainingDay) {
    return {
      ok: false,
      message: "找不到對應的訓練日，請重新整理後再試一次。"
    };
  }

  const ownerUserProfileId = trainingDay.trainingPlanVersion.trainingPlan.userProfileId;
  const trainingDayDate = toDateInput(trainingDay.date);
  const todayDate = toDateInput(new Date());

  if (ownerUserProfileId !== userProfileId) {
    return {
      ok: false,
      message: `${recordName}與目前使用者資料不一致，請重新整理後再試一次。`
    };
  }

  if (logDate !== trainingDayDate) {
    return {
      ok: false,
      message: `${recordName}日期必須是選定當天，請重新選擇日期後再送出。`
    };
  }

  if (trainingDayDate > todayDate) {
    return {
      ok: false,
      message: `未來日期不可填寫${recordName}。`
    };
  }

  return null;
}

export async function saveWorkoutLog(
  values: WorkoutLogFormValues
): Promise<CalendarActionResult> {
  const parsed = workoutLogFormSchema.safeParse(values);

  if (!parsed.success) {
    return {
      ok: false,
      message: "訓練紀錄資料不完整，請確認必填欄位與數值格式。"
    };
  }

  const data = parsed.data;

  try {
    const trainingDay = await getTrainingDayForWrite(data.trainingDayId);
    const invalid = validateTrainingDayWrite({
      trainingDay,
      userProfileId: data.userProfileId,
      logDate: data.logDate,
      recordName: "訓練紀錄"
    });

    if (invalid) {
      return invalid;
    }

    await prisma.$transaction(async (tx) => {
      const workoutLogData = {
        userProfileId: data.userProfileId,
        trainingDayId: data.trainingDayId,
        logDate: new Date(data.logDate),
        rawInput: buildWorkoutRawInput(data),
        workoutType: toNullableText(data.workoutType),
        distanceKm: toNullableNumber(data.distanceKm),
        durationMin: toNullableInt(data.durationMin),
        pace: toNullableText(data.pace),
        heartRateAvg: toNullableInt(data.heartRateAvg),
        fatigueScore: toNullableInt(data.fatigueScore),
        painLocation: toNullableText(data.painLocation),
        painScore: toNullableInt(data.painScore),
        completionStatus: data.completionStatus
      };

      if (data.workoutLogId) {
        await tx.workoutLog.update({
          where: { id: data.workoutLogId },
          data: workoutLogData
        });
      } else {
        await tx.workoutLog.create({
          data: workoutLogData
        });
      }

      await tx.trainingDay.update({
        where: { id: data.trainingDayId },
        data: { completionStatus: data.completionStatus }
      });
    });

    revalidatePath("/calendar");
    revalidatePath("/dashboard");

    return {
      ok: true,
      message: "訓練紀錄已儲存。"
    };
  } catch {
    return {
      ok: false,
      message: "訓練紀錄儲存失敗，請稍後再試。"
    };
  }
}

export async function saveFoodLog(
  values: FoodLogFormValues
): Promise<CalendarActionResult> {
  const parsed = foodLogFormSchema.safeParse(values);

  if (!parsed.success) {
    return {
      ok: false,
      message: "飲食紀錄資料不完整，請確認餐別、飲食內容與數值格式。"
    };
  }

  const data = parsed.data;

  try {
    const trainingDay = await getTrainingDayForWrite(data.trainingDayId);
    const invalid = validateTrainingDayWrite({
      trainingDay,
      userProfileId: data.userProfileId,
      logDate: data.logDate,
      recordName: "飲食紀錄"
    });

    if (invalid) {
      return invalid;
    }

    const workoutLog = data.workoutLogId
      ? await prisma.workoutLog.findFirst({
          where: {
            id: data.workoutLogId,
            userProfileId: data.userProfileId
          },
          select: { id: true }
        })
      : null;

    const foodLogData = {
      userProfileId: data.userProfileId,
      trainingDayId: data.trainingDayId,
      workoutLogId: workoutLog?.id ?? null,
      logDate: new Date(data.logDate),
      rawInput: data.rawInput.trim(),
      mealType: data.mealType,
      estimatedCarbsG: toNullableNumber(data.estimatedCarbsG),
      estimatedProteinG: toNullableNumber(data.estimatedProteinG),
      estimatedCalories: toNullableNumber(data.estimatedCalories),
      estimateNote: toNullableText(data.estimateNote)
    };

    if (data.foodLogId) {
      const foodLog = await prisma.foodLog.findFirst({
        where: {
          id: data.foodLogId,
          userProfileId: data.userProfileId,
          trainingDayId: data.trainingDayId
        },
        select: { id: true }
      });

      if (!foodLog) {
        return {
          ok: false,
          message: "找不到要修改的飲食紀錄，請重新整理後再試一次。"
        };
      }

      await prisma.foodLog.update({
        where: { id: foodLog.id },
        data: {
          ...foodLogData,
          foodItemsJson: null
        }
      });
    } else {
      await prisma.foodLog.create({
        data: foodLogData
      });
    }

    revalidatePath("/calendar");
    revalidatePath("/dashboard");

    return {
      ok: true,
      message: data.foodLogId ? "飲食紀錄已更新。" : "飲食紀錄已儲存。"
    };
  } catch {
    return {
      ok: false,
      message: "飲食紀錄儲存失敗，請稍後再試。"
    };
  }
}

export async function deleteFoodLog(
  values: DeleteFoodLogValues
): Promise<CalendarActionResult> {
  if (!values.foodLogId || !values.userProfileId) {
    return {
      ok: false,
      message: "缺少飲食紀錄資料，請重新整理後再試一次。"
    };
  }

  try {
    const foodLog = await prisma.foodLog.findFirst({
      where: {
        id: values.foodLogId,
        userProfileId: values.userProfileId
      },
      select: {
        id: true,
        logDate: true
      }
    });

    if (!foodLog) {
      return {
        ok: false,
        message: "找不到要刪除的飲食紀錄，請重新整理後再試一次。"
      };
    }

    if (toDateInput(foodLog.logDate) > toDateInput(new Date())) {
      return {
        ok: false,
        message: "未來日期不可刪除飲食紀錄。"
      };
    }

    await prisma.foodLog.delete({
      where: { id: foodLog.id }
    });

    revalidatePath("/calendar");
    revalidatePath("/dashboard");

    return {
      ok: true,
      message: "飲食紀錄已刪除。"
    };
  } catch {
    return {
      ok: false,
      message: "飲食紀錄刪除失敗，請稍後再試。"
    };
  }
}
