"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import {
  saveWorkoutLog,
  type CalendarActionResult
} from "@/app/calendar/actions";
import {
  type WorkoutLogFormValues,
  workoutLogFormSchema
} from "@/schemas/forms/workout-log";
import { sportCategories, sportCategoryLabels } from "@/lib/sport-category";

type WorkoutLogFormProps = {
  canReport: boolean;
  dateLabel: string;
  initialValues: WorkoutLogFormValues;
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

export function WorkoutLogForm({
  canReport,
  dateLabel,
  initialValues,
  onCancel,
  onSaved
}: WorkoutLogFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<CalendarActionResult | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<WorkoutLogFormValues>({
    defaultValues: initialValues,
    resolver: zodResolver(workoutLogFormSchema)
  });

  const fatigueScore = Number(watch("fatigueScore") || 0);
  const painScore = Number(watch("painScore") || 0);
  const shouldShowRiskNotice = fatigueScore >= 8 || painScore >= 4;

  const onSubmit = (values: WorkoutLogFormValues) => {
    setResult(null);
    startTransition(async () => {
      const actionResult = await saveWorkoutLog(values);
      setResult(actionResult);

      if (actionResult.ok) {
        onSaved?.();
        router.refresh();
      }
    });
  };

  return (
    <form
      className="rounded-lg border border-line bg-panel p-5"
      onSubmit={handleSubmit(onSubmit)}
    >
      <input type="hidden" {...register("workoutLogId")} />
      <input type="hidden" {...register("trainingDayId")} />
      <input type="hidden" {...register("userProfileId")} />
      <input type="hidden" {...register("logDate")} />

      <div className="border-b border-line pb-4">
        <h3 className="font-semibold text-foreground">
          {initialValues.workoutLogId ? "編輯實際訓練紀錄" : "訓練完成紀錄"}
        </h3>
        <p className="mt-1 text-sm leading-6 text-muted">
          回報當日實際完成狀況。若有明顯疼痛或疲勞偏高，建議先降低強度並觀察身體狀態。
        </p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="rounded-md border border-line bg-background p-3">
          <p className="text-xs font-semibold text-muted">回報日期</p>
          <p className="mt-2 text-sm font-medium text-foreground">
            {dateLabel}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted">
            回報日期固定為月曆選定日期，不能手動修改。
          </p>
          <FieldError message={errors.logDate?.message} />
        </div>

        <label className={labelClass}>
          完成狀態
          <select
            className={inputClass}
            disabled={!canReport || isPending}
            {...register("completionStatus")}
          >
            <option value="completed">已完成</option>
            <option value="partial">部分完成</option>
            <option value="missed">未完成</option>
            <option value="changed">已調整</option>
            <option value="rest">休息</option>
          </select>
          <FieldError message={errors.completionStatus?.message} />
        </label>

        <label className={labelClass}>
          運動分類
          <select
            className={inputClass}
            disabled={!canReport || isPending}
            {...register("sportCategory")}
          >
            <option value="">休息或尚未分類</option>
            {sportCategories.map((category) => (
              <option key={category} value={category}>
                {sportCategoryLabels[category]}
              </option>
            ))}
          </select>
          <FieldError message={errors.sportCategory?.message} />
        </label>

        <label className={labelClass}>
          訓練類型
          <input
            className={inputClass}
            disabled={!canReport || isPending}
            placeholder="例如 easy / interval / strength"
            {...register("workoutType")}
          />
        </label>

        <label className={labelClass}>
          實際距離（km）
          <input
            className={inputClass}
            disabled={!canReport || isPending}
            inputMode="decimal"
            {...register("distanceKm")}
          />
          <FieldError message={errors.distanceKm?.message} />
        </label>

        <label className={labelClass}>
          實際時間（分鐘）
          <input
            className={inputClass}
            disabled={!canReport || isPending}
            inputMode="numeric"
            {...register("durationMin")}
          />
          <FieldError message={errors.durationMin?.message} />
        </label>

        <label className={labelClass}>
          實際配速
          <input
            className={inputClass}
            disabled={!canReport || isPending}
            placeholder="例如 6:10/km"
            {...register("pace")}
          />
        </label>

        <label className={labelClass}>
          平均心率
          <input
            className={inputClass}
            disabled={!canReport || isPending}
            inputMode="numeric"
            {...register("heartRateAvg")}
          />
          <FieldError message={errors.heartRateAvg?.message} />
        </label>

        <label className={labelClass}>
          疲勞分數（1-10）
          <input
            className={inputClass}
            disabled={!canReport || isPending}
            inputMode="numeric"
            {...register("fatigueScore")}
          />
          <FieldError message={errors.fatigueScore?.message} />
        </label>

        <label className={labelClass}>
          疼痛分數（0-10）
          <input
            className={inputClass}
            disabled={!canReport || isPending}
            inputMode="numeric"
            {...register("painScore")}
          />
          <FieldError message={errors.painScore?.message} />
        </label>

        <label className={`${labelClass} md:col-span-3`}>
          疼痛部位
          <input
            className={inputClass}
            disabled={!canReport || isPending}
            placeholder="例如左膝、右小腿，沒有疼痛可留空"
            {...register("painLocation")}
          />
        </label>

        <label className={`${labelClass} md:col-span-3`}>
          備註
          <textarea
            className={`${inputClass} min-h-24 resize-y`}
            disabled={!canReport || isPending}
            placeholder="例如今天改成慢跑 30 分鐘，後段有些疲勞。"
            {...register("rawInput")}
          />
        </label>
      </div>

      {shouldShowRiskNotice ? (
        <div className="mt-5 rounded-md border border-danger bg-background p-3 text-sm leading-6 text-danger">
          目前疲勞或疼痛分數偏高。這不是醫療診斷，建議降低強度、增加恢復時間；若疼痛持續或加重，請尋求專業協助。
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p
          className={`text-sm ${
            result ? (result.ok ? "text-primary" : "text-danger") : "text-muted"
          }`}
        >
          {result?.message ??
            (canReport
              ? "儲存後會更新月曆上的完成狀態。"
              : "未來的訓練規劃不可回報，請等訓練日當天或之後再填寫。")}
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          {onCancel ? (
            <button
              className="rounded-md border border-line bg-background px-4 py-2 text-sm font-semibold text-foreground"
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
            {isPending ? "儲存中" : "儲存訓練紀錄"}
          </button>
        </div>
      </div>
    </form>
  );
}
