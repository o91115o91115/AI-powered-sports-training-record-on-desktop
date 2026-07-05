import { z } from "zod";

const optionalText = z.string().trim().optional();
const requiredText = (message: string) => z.string().trim().min(1, message);

const optionalNumberText = (label: string, min?: number, max?: number) =>
  z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || Number.isFinite(Number(value)), {
      message: `${label}格式不正確，請輸入數字。`
    })
    .refine((value) => !value || min === undefined || Number(value) >= min, {
      message: `${label}不可小於 ${min}。`
    })
    .refine((value) => !value || max === undefined || Number(value) <= max, {
      message: `${label}不可大於 ${max}。`
    });

const optionalIntegerText = (label: string, min?: number, max?: number) =>
  optionalNumberText(label, min, max).refine(
    (value) => !value || Number.isInteger(Number(value)),
    {
      message: `${label}請輸入整數。`
    }
  );

export const workoutCompletionStatuses = [
  "completed",
  "partial",
  "missed",
  "changed",
  "rest"
] as const;

export const workoutLogFormSchema = z.object({
  workoutLogId: optionalText,
  trainingDayId: requiredText("缺少訓練日資料，請重新整理頁面後再試一次。"),
  userProfileId: requiredText("缺少使用者資料，請先建立使用者設定。"),
  logDate: requiredText("請選擇紀錄日期。").refine(
    (value) => !Number.isNaN(Date.parse(value)),
    {
      message: "紀錄日期格式不正確。"
    }
  ),
  completionStatus: z.enum(workoutCompletionStatuses, {
    errorMap: () => ({ message: "請選擇完成狀態。" })
  }),
  workoutType: optionalText,
  distanceKm: optionalNumberText("實際距離", 0, 200),
  durationMin: optionalIntegerText("實際時間", 0, 1440),
  pace: optionalText,
  heartRateAvg: optionalIntegerText("平均心率", 0, 240),
  fatigueScore: optionalIntegerText("疲勞分數", 1, 10),
  painLocation: optionalText,
  painScore: optionalIntegerText("疼痛分數", 0, 10),
  rawInput: optionalText
});

export type WorkoutLogFormValues = z.infer<typeof workoutLogFormSchema>;

export const emptyWorkoutLogValues: WorkoutLogFormValues = {
  workoutLogId: "",
  trainingDayId: "",
  userProfileId: "",
  logDate: "",
  completionStatus: "completed",
  workoutType: "",
  distanceKm: "",
  durationMin: "",
  pace: "",
  heartRateAvg: "",
  fatigueScore: "",
  painLocation: "",
  painScore: "",
  rawInput: ""
};
