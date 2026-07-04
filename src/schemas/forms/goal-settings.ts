import { z } from "zod";

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

export const goalSettingsFormSchema = z.object({
  userProfileId: optionalText,
  trainingGoalId: optionalText,
  name: requiredText("請輸入使用者名稱"),
  age: optionalIntegerText("年齡", 1, 120),
  gender: optionalText,
  heightCm: optionalNumberText("身高", 50, 250),
  weightKg: optionalNumberText("體重", 20, 300),
  dietaryRestrictions: optionalText,
  raceName: optionalText,
  targetDistance: requiredText("請輸入目標距離"),
  raceDate: optionalText.refine((value) => !value || !Number.isNaN(Date.parse(value)), {
    message: "比賽日期格式不正確"
  }),
  targetFinishTime: optionalText,
  goalType: optionalText,
  currentWeeklyMileageKm: optionalNumberText("目前週跑量", 0, 300),
  recentFiveKTime: optionalText,
  recentTenKTime: optionalText,
  recentHalfMarathonTime: optionalText,
  hasMarathonExperience: z.boolean(),
  weeklyTrainingDays: optionalIntegerText("每週可訓練天數", 1, 7),
  preferredTrainingDays: optionalText,
  unavailableDates: optionalText,
  injuryNote: optionalText,
  fatigueLevel: optionalText
});

export type GoalSettingsFormValues = z.infer<typeof goalSettingsFormSchema>;

export const emptyGoalSettingsValues: GoalSettingsFormValues = {
  userProfileId: "",
  trainingGoalId: "",
  name: "",
  age: "",
  gender: "",
  heightCm: "",
  weightKg: "",
  dietaryRestrictions: "",
  raceName: "",
  targetDistance: "",
  raceDate: "",
  targetFinishTime: "",
  goalType: "",
  currentWeeklyMileageKm: "",
  recentFiveKTime: "",
  recentTenKTime: "",
  recentHalfMarathonTime: "",
  hasMarathonExperience: false,
  weeklyTrainingDays: "",
  preferredTrainingDays: "",
  unavailableDates: "",
  injuryNote: "",
  fatigueLevel: ""
};
