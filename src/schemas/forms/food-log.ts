import { z } from "zod";

const optionalText = z.string().trim().optional();
const requiredText = (message: string) => z.string().trim().min(1, message);

const optionalNumberText = (label: string, min?: number, max?: number) =>
  z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || Number.isFinite(Number(value)), {
      message: `${label}必須是有效數字。`
    })
    .refine((value) => !value || min === undefined || Number(value) >= min, {
      message: `${label}不可小於 ${min}。`
    })
    .refine((value) => !value || max === undefined || Number(value) <= max, {
      message: `${label}不可大於 ${max}。`
    });

export const mealTypes = [
  "breakfast",
  "lunch",
  "dinner",
  "pre_workout",
  "post_workout",
  "fuel",
  "snack",
  "other"
] as const;

export const foodLogFormSchema = z.object({
  foodLogId: optionalText,
  trainingDayId: requiredText("缺少訓練日資料，請重新整理後再試一次。"),
  userProfileId: requiredText("缺少使用者資料，請重新整理後再試一次。"),
  workoutLogId: optionalText,
  logDate: requiredText("請提供紀錄日期。").refine(
    (value) => !Number.isNaN(Date.parse(value)),
    {
      message: "紀錄日期格式不正確。"
    }
  ),
  mealType: z.enum(mealTypes, {
    errorMap: () => ({ message: "請選擇餐別。" })
  }),
  rawInput: requiredText("請輸入實際飲食內容。"),
  estimatedCarbsG: optionalNumberText("估計碳水", 0, 1000),
  estimatedProteinG: optionalNumberText("估計蛋白質", 0, 500),
  estimatedCalories: optionalNumberText("估計熱量", 0, 10000),
  estimateNote: optionalText
});

export type FoodLogFormValues = z.infer<typeof foodLogFormSchema>;

export const emptyFoodLogValues: FoodLogFormValues = {
  foodLogId: "",
  trainingDayId: "",
  userProfileId: "",
  workoutLogId: "",
  logDate: "",
  mealType: "other",
  rawInput: "",
  estimatedCarbsG: "",
  estimatedProteinG: "",
  estimatedCalories: "",
  estimateNote: ""
};
