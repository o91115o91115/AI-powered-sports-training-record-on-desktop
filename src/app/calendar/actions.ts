"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import {
  type WorkoutLogFormValues,
  workoutLogFormSchema
} from "@/schemas/forms/workout-log";

export type CalendarActionResult = {
  ok: boolean;
  message: string;
};

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

const toDateInput = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const buildRawInput = (data: WorkoutLogFormValues) => {
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
    data.painLocation ? `疼痛部位：${data.painLocation}` : null
  ]
    .filter(Boolean)
    .join("；");
};

export async function saveWorkoutLog(
  values: WorkoutLogFormValues
): Promise<CalendarActionResult> {
  const parsed = workoutLogFormSchema.safeParse(values);

  if (!parsed.success) {
    return {
      ok: false,
      message: "訓練紀錄資料不完整，請確認完成狀態、日期與數值格式。"
    };
  }

  const data = parsed.data;

  try {
    const trainingDay = await prisma.trainingDay.findUnique({
      where: { id: data.trainingDayId },
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

    if (!trainingDay) {
      return {
        ok: false,
        message: "找不到對應的訓練日，請重新整理月曆後再試一次。"
      };
    }

    const ownerUserProfileId = trainingDay.trainingPlanVersion.trainingPlan.userProfileId;
    const trainingDayDate = toDateInput(trainingDay.date);
    const todayDate = toDateInput(new Date());

    if (ownerUserProfileId !== data.userProfileId) {
      return {
        ok: false,
        message: "訓練紀錄與使用者資料不一致，請重新整理後再試一次。"
      };
    }

    if (data.logDate !== trainingDayDate) {
      return {
        ok: false,
        message: "回報日期必須等於月曆選定的訓練日，請重新整理後再試一次。"
      };
    }

    if (trainingDayDate > todayDate) {
      return {
        ok: false,
        message: "未來的訓練規劃不可回報，請等訓練日當天或之後再填寫。"
      };
    }

    await prisma.$transaction(async (tx) => {
      const workoutLogData = {
        userProfileId: data.userProfileId,
        trainingDayId: data.trainingDayId,
        logDate: new Date(data.logDate),
        rawInput: buildRawInput(data),
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
      message: "訓練紀錄已儲存，月曆狀態已更新。"
    };
  } catch {
    return {
      ok: false,
      message: "訓練紀錄儲存失敗，請稍後再試。"
    };
  }
}
