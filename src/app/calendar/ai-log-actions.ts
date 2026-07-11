"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { parseDailyLog } from "@/services/ai/logging-agent";

const dailyLogAiFormSchema = z.object({
  trainingDayId: z.string().min(1),
  userProfileId: z.string().min(1),
  workoutLogId: z.string().optional(),
  logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  text: z.string().trim().min(1)
});

export type DailyLogAiFormValues = z.infer<typeof dailyLogAiFormSchema>;

export type ParsedWorkoutSummary = {
  workoutType: string | null;
  distanceKm: number | null;
  durationMin: number | null;
  pace: string | null;
  fatigueScore: number | null;
  painLocation: string | null;
  painScore: number | null;
  completionStatus: string | null;
};

export type ParsedNutritionSummary = {
  mealType: string | null;
  foodItems: string[];
  estimatedCarbsG: number | null;
  estimatedProteinG: number | null;
  estimatedCalories: number | null;
  estimateNote: string | null;
};

export type DailyLogAiActionResult = {
  ok: boolean;
  message: string;
  createdWorkoutLog: boolean;
  createdFoodLog: boolean;
  parsedWorkout: ParsedWorkoutSummary | null;
  parsedNutrition: ParsedNutritionSummary | null;
  missingInformation: string[];
  safetyNote: string | null;
};

const emptyResult = (
  message: string,
  overrides: Partial<DailyLogAiActionResult> = {}
): DailyLogAiActionResult => ({
  ok: false,
  message,
  createdWorkoutLog: false,
  createdFoodLog: false,
  parsedWorkout: null,
  parsedNutrition: null,
  missingInformation: [],
  safetyNote: null,
  ...overrides
});

const toDateInput = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const toNullableText = (value: string | null | undefined) => {
  const text = value?.trim();
  return text ? text : null;
};

const buildNutritionRawInput = (nutrition: ParsedNutritionSummary) => {
  const foodText = nutrition.foodItems.length > 0 ? nutrition.foodItems.join("、") : "AI 解析飲食紀錄";
  const note = toNullableText(nutrition.estimateNote);

  return note ? `${foodText}（${note}）` : foodText;
};

export async function saveAiDailyLog(
  values: DailyLogAiFormValues
): Promise<DailyLogAiActionResult> {
  const parsed = dailyLogAiFormSchema.safeParse(values);

  if (!parsed.success) {
    return emptyResult("請輸入要解析的訓練或飲食紀錄內容。");
  }

  const data = parsed.data;

  try {
    const trainingDay = await prisma.trainingDay.findUnique({
      where: { id: data.trainingDayId },
      include: {
        workoutLogs: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true }
        },
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
      return emptyResult("找不到對應的訓練日，請重新整理後再試一次。");
    }

    const ownerUserProfileId = trainingDay.trainingPlanVersion.trainingPlan.userProfileId;
    const trainingDayDate = toDateInput(trainingDay.date);
    const todayDate = toDateInput(new Date());

    if (ownerUserProfileId !== data.userProfileId) {
      return emptyResult("此紀錄與目前使用者資料不一致，請重新整理後再試一次。");
    }

    if (data.logDate !== trainingDayDate) {
      return emptyResult("回報日期必須是選定當天，請重新選擇日期後再送出。");
    }

    if (trainingDayDate > todayDate) {
      return emptyResult("未來的規劃不可回報，請等訓練日當天或之後再新增紀錄。");
    }

    // AI 只負責把自然語句轉成固定格式；可寫入日期與資料歸屬仍由後端驗證。
    const aiResult = await parseDailyLog({
      text: data.text,
      logDate: data.logDate
    });

    const parsedWorkout = aiResult.workout
      ? {
          workoutType: toNullableText(aiResult.workout.workoutType),
          distanceKm: aiResult.workout.distanceKm,
          durationMin: aiResult.workout.durationMin,
          pace: toNullableText(aiResult.workout.pace),
          fatigueScore: aiResult.workout.fatigueScore,
          painLocation: toNullableText(aiResult.workout.painLocation),
          painScore: aiResult.workout.painScore,
          completionStatus: aiResult.workout.completionStatus
        }
      : null;

    const parsedNutrition = aiResult.nutrition
      ? {
          mealType: aiResult.nutrition.mealType,
          foodItems: aiResult.nutrition.foodItems,
          estimatedCarbsG: aiResult.nutrition.estimatedCarbsG,
          estimatedProteinG: aiResult.nutrition.estimatedProteinG,
          estimatedCalories: aiResult.nutrition.estimatedCalories,
          estimateNote: toNullableText(aiResult.nutrition.estimateNote)
        }
      : null;

    if (!parsedWorkout && !parsedNutrition) {
      return emptyResult("AI 沒有解析出可寫入的訓練或飲食內容，請補充距離、時間或餐點內容後再試一次。", {
        missingInformation: aiResult.missingInformation,
        safetyNote: aiResult.safetyNote
      });
    }

    const created = await prisma.$transaction(async (tx) => {
      let workoutLogId = trainingDay.workoutLogs[0]?.id ?? null;
      let createdWorkoutLog = false;
      let createdFoodLog = false;

      if (parsedWorkout) {
        const completionStatus = parsedWorkout.completionStatus ?? "completed";
        const workoutLog = await tx.workoutLog.create({
          data: {
            userProfileId: data.userProfileId,
            trainingDayId: data.trainingDayId,
            logDate: new Date(data.logDate),
            rawInput: data.text.trim(),
            workoutType: parsedWorkout.workoutType,
            distanceKm: parsedWorkout.distanceKm,
            durationMin: parsedWorkout.durationMin,
            pace: parsedWorkout.pace,
            fatigueScore: parsedWorkout.fatigueScore,
            painLocation: parsedWorkout.painLocation,
            painScore: parsedWorkout.painScore,
            completionStatus
          },
          select: { id: true }
        });

        await tx.trainingDay.update({
          where: { id: data.trainingDayId },
          data: { completionStatus }
        });

        workoutLogId = workoutLog.id;
        createdWorkoutLog = true;
      }

      if (parsedNutrition) {
        await tx.foodLog.create({
          data: {
            userProfileId: data.userProfileId,
            trainingDayId: data.trainingDayId,
            workoutLogId,
            logDate: new Date(data.logDate),
            rawInput: buildNutritionRawInput(parsedNutrition),
            mealType: parsedNutrition.mealType,
            foodItemsJson: JSON.stringify(parsedNutrition.foodItems),
            estimatedCarbsG: parsedNutrition.estimatedCarbsG,
            estimatedProteinG: parsedNutrition.estimatedProteinG,
            estimatedCalories: parsedNutrition.estimatedCalories,
            estimateNote: parsedNutrition.estimateNote
          }
        });

        createdFoodLog = true;
      }

      return { createdWorkoutLog, createdFoodLog };
    });

    revalidatePath("/calendar");
    revalidatePath("/dashboard");

    return {
      ok: true,
      message: "AI 已解析並寫入本日紀錄。",
      createdWorkoutLog: created.createdWorkoutLog,
      createdFoodLog: created.createdFoodLog,
      parsedWorkout,
      parsedNutrition,
      missingInformation: aiResult.missingInformation,
      safetyNote: aiResult.safetyNote
    };
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("OPENAI_API_KEY")
        ? "目前尚未完成 AI 服務設定，無法使用 AI 解析紀錄。"
        : "AI 解析或儲存紀錄時發生錯誤，請稍後再試，或改用手動紀錄。";

    return emptyResult(message);
  }
}
