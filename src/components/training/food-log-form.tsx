"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { saveFoodLog, type CalendarActionResult } from "@/app/calendar/actions";
import {
  type FoodLogFormValues,
  foodLogFormSchema
} from "@/schemas/forms/food-log";

type FoodLogFormProps = {
  canReport: boolean;
  dateLabel: string;
  initialValues: FoodLogFormValues;
  mode?: "create" | "edit";
  onCancel?: () => void;
  onSaved?: () => void;
};

const inputClass =
  "mt-2 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-background disabled:text-muted";
const labelClass = "text-sm font-medium text-foreground";
const errorClass = "mt-1 text-xs font-medium text-danger";

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className={errorClass}>{message}</p>;
}

export function FoodLogForm({
  canReport,
  dateLabel,
  initialValues,
  mode = "create",
  onCancel,
  onSaved
}: FoodLogFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<CalendarActionResult | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<FoodLogFormValues>({
    defaultValues: initialValues,
    resolver: zodResolver(foodLogFormSchema)
  });

  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  const onSubmit = (values: FoodLogFormValues) => {
    setResult(null);
    startTransition(async () => {
      const actionResult = await saveFoodLog(values);
      setResult(actionResult);

      if (actionResult.ok) {
        if (mode === "create") {
          reset({
            ...initialValues,
            foodLogId: "",
            mealType: "other",
            rawInput: "",
            estimatedCarbsG: "",
            estimatedProteinG: "",
            estimatedCalories: "",
            estimateNote: ""
          });
        } else {
          onSaved?.();
        }

        router.refresh();
      }
    });
  };

  const isEditMode = mode === "edit";

  return (
    <form className="rounded-lg border border-line bg-panel p-5" onSubmit={handleSubmit(onSubmit)}>
      <input type="hidden" {...register("foodLogId")} />
      <input type="hidden" {...register("trainingDayId")} />
      <input type="hidden" {...register("userProfileId")} />
      <input type="hidden" {...register("workoutLogId")} />
      <input type="hidden" {...register("logDate")} />

      <div className="border-b border-line pb-4">
        <h3 className="font-semibold text-foreground">
          {isEditMode ? "編輯飲食紀錄" : "新增飲食紀錄"}
        </h3>
        <p className="mt-1 text-sm leading-6 text-muted">
          {isEditMode
            ? "修正餐別、食物內容與估算營養數字。"
            : "記錄當日實際飲食，可自行填寫粗估碳水、蛋白質與熱量。"}
        </p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="rounded-md border border-line bg-background p-3">
          <p className="text-xs font-semibold text-muted">紀錄日期</p>
          <p className="mt-2 text-sm font-medium text-foreground">{dateLabel}</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            飲食紀錄日期固定為選定當天，不可手動變更。
          </p>
          <FieldError message={errors.logDate?.message} />
        </div>

        <label className={labelClass}>
          餐別
          <select className={inputClass} disabled={!canReport || isPending} {...register("mealType")}>
            <option value="breakfast">早餐</option>
            <option value="lunch">午餐</option>
            <option value="dinner">晚餐</option>
            <option value="pre_workout">訓練前</option>
            <option value="post_workout">訓練後</option>
            <option value="fuel">補給</option>
            <option value="snack">點心</option>
            <option value="other">其他</option>
          </select>
          <FieldError message={errors.mealType?.message} />
        </label>

        <label className={labelClass}>
          估計熱量
          <input
            className={inputClass}
            disabled={!canReport || isPending}
            inputMode="decimal"
            placeholder="kcal"
            {...register("estimatedCalories")}
          />
          <FieldError message={errors.estimatedCalories?.message} />
        </label>

        <label className={`${labelClass} md:col-span-3`}>
          實際飲食內容
          <textarea
            className={`${inputClass} min-h-24 resize-y`}
            disabled={!canReport || isPending}
            placeholder="例：早餐吃飯糰、無糖豆漿、香蕉。"
            {...register("rawInput")}
          />
          <FieldError message={errors.rawInput?.message} />
        </label>

        <label className={labelClass}>
          估計碳水 g
          <input
            className={inputClass}
            disabled={!canReport || isPending}
            inputMode="decimal"
            {...register("estimatedCarbsG")}
          />
          <FieldError message={errors.estimatedCarbsG?.message} />
        </label>

        <label className={labelClass}>
          估計蛋白質 g
          <input
            className={inputClass}
            disabled={!canReport || isPending}
            inputMode="decimal"
            {...register("estimatedProteinG")}
          />
          <FieldError message={errors.estimatedProteinG?.message} />
        </label>

        <label className={labelClass}>
          估算備註
          <input
            className={inputClass}
            disabled={!canReport || isPending}
            placeholder="例：依一般份量粗估。"
            {...register("estimateNote")}
          />
        </label>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p
          className={`text-sm ${
            result ? (result.ok ? "text-primary" : "text-danger") : "text-muted"
          }`}
        >
          {result?.message ??
            (canReport
              ? isEditMode
                ? "修改後會更新這筆飲食紀錄。"
                : "儲存後會新增一筆當日飲食紀錄。"
              : "未來日期不可填寫飲食紀錄。")}
        </p>
        <div className="flex flex-wrap gap-2">
          {isEditMode && onCancel ? (
            <button
              className="inline-flex items-center justify-center rounded-md border border-line px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isPending}
              onClick={onCancel}
              type="button"
            >
              取消
            </button>
          ) : null}
          <button
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!canReport || isPending}
            type="submit"
          >
            <Save size={16} />
            {isPending ? "儲存中" : isEditMode ? "更新飲食紀錄" : "儲存飲食紀錄"}
          </button>
        </div>
      </div>
    </form>
  );
}
