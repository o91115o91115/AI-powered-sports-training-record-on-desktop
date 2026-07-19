"use server";

import { prisma } from "@/lib/prisma";
import { revalidateTrainingViews } from "@/lib/revalidate-training-views";
import {
  type GoalSettingsFormValues,
  goalSettingsFormSchema
} from "@/schemas/forms/goal-settings";

export type SaveGoalSettingsResult = {
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

const toNullableDate = (value?: string) => {
  const text = value?.trim();
  return text ? new Date(text) : null;
};

export async function saveGoalSettings(
  values: GoalSettingsFormValues
): Promise<SaveGoalSettingsResult> {
  const parsed = goalSettingsFormSchema.safeParse(values);

  if (!parsed.success) {
    return {
      ok: false,
      message: "資料格式不完整，請確認必填欄位與數值格式。"
    };
  }

  const data = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      const userProfile = data.userProfileId
        ? await tx.userProfile.update({
            where: { id: data.userProfileId },
            data: {
              name: data.name.trim(),
              age: toNullableInt(data.age),
              gender: toNullableText(data.gender),
              heightCm: toNullableNumber(data.heightCm),
              weightKg: toNullableNumber(data.weightKg),
              dietaryRestrictions: toNullableText(data.dietaryRestrictions)
            }
          })
        : await tx.userProfile.create({
            data: {
              name: data.name.trim(),
              age: toNullableInt(data.age),
              gender: toNullableText(data.gender),
              heightCm: toNullableNumber(data.heightCm),
              weightKg: toNullableNumber(data.weightKg),
              dietaryRestrictions: toNullableText(data.dietaryRestrictions)
            }
          });

      const goalData = {
        userProfileId: userProfile.id,
        raceName: toNullableText(data.raceName),
        targetDistance: data.targetDistance.trim(),
        raceDate: toNullableDate(data.raceDate),
        targetFinishTime: toNullableText(data.targetFinishTime),
        goalType: toNullableText(data.goalType),
        currentWeeklyMileageKm: toNullableNumber(data.currentWeeklyMileageKm),
        recentFiveKTime: toNullableText(data.recentFiveKTime),
        recentTenKTime: toNullableText(data.recentTenKTime),
        recentHalfMarathonTime: toNullableText(data.recentHalfMarathonTime),
        hasMarathonExperience: data.hasMarathonExperience,
        weeklyTrainingDays: toNullableInt(data.weeklyTrainingDays),
        preferredTrainingDays: toNullableText(data.preferredTrainingDays),
        unavailableDates: toNullableText(data.unavailableDates),
        injuryNote: toNullableText(data.injuryNote),
        fatigueLevel: toNullableText(data.fatigueLevel)
      };

      if (data.trainingGoalId) {
        await tx.trainingGoal.update({
          where: { id: data.trainingGoalId },
          data: goalData
        });
        return;
      }

      await tx.trainingGoal.create({ data: goalData });
    });

    revalidateTrainingViews();

    return {
      ok: true,
      message: "基本資料與訓練目標已儲存。"
    };
  } catch {
    return {
      ok: false,
      message: "資料儲存失敗，請確認本機資料庫可正常讀寫後再試一次。"
    };
  }
}
