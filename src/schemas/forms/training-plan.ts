import { z } from "zod";

import { sportCategories } from "@/lib/sport-category";

const optionalText = z.string().trim().optional();
const requiredText = (message: string) => z.string().trim().min(1, message);

const optionalNumberText = (label: string, min?: number, max?: number) =>
  z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || Number.isFinite(Number(value)), {
      message: `${label}必須是數字`
    })
    .refine((value) => !value || min === undefined || Number(value) >= min, {
      message: `${label}不可小於 ${min}`
    })
    .refine((value) => !value || max === undefined || Number(value) <= max, {
      message: `${label}不可大於 ${max}`
    });

const optionalIntegerText = (label: string, min?: number, max?: number) =>
  optionalNumberText(label, min, max).refine(
    (value) => !value || Number.isInteger(Number(value)),
    {
      message: `${label}必須是整數`
    }
  );

const optionalDateText = optionalText.refine(
  (value) => !value || !Number.isNaN(Date.parse(value)),
  {
    message: "日期格式不正確"
  }
);

export const trainingPlanFormSchema = z
  .object({
    userProfileId: requiredText("缺少使用者資料，請先完成目標設定"),
    trainingGoalId: optionalText,
    title: requiredText("請輸入訓練計畫名稱"),
    startDate: optionalDateText,
    endDate: optionalDateText
  })
  .refine(
    (value) =>
      !value.startDate ||
      !value.endDate ||
      new Date(value.startDate).getTime() <= new Date(value.endDate).getTime(),
    {
      message: "結束日期不可早於開始日期",
      path: ["endDate"]
    }
  );

export const trainingPlanVersionFormSchema = z.object({
  trainingPlanId: requiredText("缺少訓練計畫"),
  summary: requiredText("請輸入版本摘要")
});

export const trainingDayFormSchema = z
  .object({
    trainingDayId: optionalText,
    trainingPlanVersionId: requiredText("缺少計畫版本"),
    date: requiredText("請選擇訓練日期").refine(
      (value) => !Number.isNaN(Date.parse(value)),
      {
        message: "訓練日期格式不正確"
      }
    ),
    sportCategory: z.union([z.enum(sportCategories), z.literal("")]).optional(),
    trainingType: requiredText("請選擇訓練類型"),
    targetDistanceKm: optionalNumberText("目標距離", 0, 200),
    targetDurationMin: optionalIntegerText("目標時間", 0, 1440),
    targetPace: optionalText,
    targetIntensity: optionalText,
    description: optionalText,
    notes: optionalText,
    recoverySuggestion: optionalText,
    carbSuggestion: optionalText,
    proteinSuggestion: optionalText,
    hydrationSuggestion: optionalText,
    preWorkoutSuggestion: optionalText,
    postWorkoutSuggestion: optionalText,
    longRunFuelSuggestion: optionalText,
    restDaySuggestion: optionalText,
    estimateNote: optionalText
  })
  .superRefine((value, context) => {
    if (value.trainingType !== "rest" && !value.sportCategory) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "請選擇運動分類",
        path: ["sportCategory"]
      });
    }
  });

export type TrainingPlanFormValues = z.infer<typeof trainingPlanFormSchema>;
export type TrainingPlanVersionFormValues = z.infer<
  typeof trainingPlanVersionFormSchema
>;
export type TrainingDayFormValues = z.infer<typeof trainingDayFormSchema>;

export const emptyTrainingPlanValues: TrainingPlanFormValues = {
  userProfileId: "",
  trainingGoalId: "",
  title: "",
  startDate: "",
  endDate: ""
};

export const emptyTrainingDayValues: TrainingDayFormValues = {
  trainingDayId: "",
  trainingPlanVersionId: "",
  date: "",
  sportCategory: "",
  trainingType: "",
  targetDistanceKm: "",
  targetDurationMin: "",
  targetPace: "",
  targetIntensity: "",
  description: "",
  notes: "",
  recoverySuggestion: "",
  carbSuggestion: "",
  proteinSuggestion: "",
  hydrationSuggestion: "",
  preWorkoutSuggestion: "",
  postWorkoutSuggestion: "",
  longRunFuelSuggestion: "",
  restDaySuggestion: "",
  estimateNote: ""
};
