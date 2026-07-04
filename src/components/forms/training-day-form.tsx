"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import {
  deleteTrainingDay,
  type PlannerActionResult,
  saveTrainingDay
} from "@/app/planner/actions";
import {
  type TrainingDayFormValues,
  trainingDayFormSchema
} from "@/schemas/forms/training-plan";

type TrainingDayFormProps = {
  canEdit: boolean;
  initialValues: TrainingDayFormValues;
  mode: "create" | "edit";
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

export function TrainingDayForm({ canEdit, initialValues, mode }: TrainingDayFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<PlannerActionResult | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<TrainingDayFormValues>({
    defaultValues: initialValues,
    resolver: zodResolver(trainingDayFormSchema)
  });

  const onSubmit = (values: TrainingDayFormValues) => {
    setResult(null);
    startTransition(async () => {
      const actionResult = await saveTrainingDay(values);
      setResult(actionResult);

      if (actionResult.ok) {
        if (mode === "create") {
          reset({
            ...initialValues,
            date: "",
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
          });
        }
        router.refresh();
      }
    });
  };

  const onDelete = () => {
    const trainingDayId = initialValues.trainingDayId;

    if (!trainingDayId) {
      return;
    }

    setResult(null);
    startTransition(async () => {
      const actionResult = await deleteTrainingDay(
        trainingDayId,
        initialValues.trainingPlanVersionId
      );
      setResult(actionResult);

      if (actionResult.ok) {
        router.refresh();
      }
    });
  };

  return (
    <form
      className={`rounded-lg border border-line bg-panel p-5 ${
        mode === "edit" ? "mt-4" : ""
      }`}
      onSubmit={handleSubmit(onSubmit)}
    >
      <input type="hidden" {...register("trainingDayId")} />
      <input type="hidden" {...register("trainingPlanVersionId")} />

      <div className="flex flex-col gap-2 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="font-semibold text-foreground">
            {mode === "create" ? "新增每日訓練" : "編輯每日訓練"}
          </h4>
          <p className="mt-1 text-sm text-muted">
            營養內容為訓練搭配方向，不是醫療或營養師診斷。
          </p>
        </div>
        {mode === "edit" ? (
          <button
            className="inline-flex items-center justify-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-semibold text-muted transition hover:border-danger hover:text-danger disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!canEdit || isPending}
            onClick={onDelete}
            type="button"
          >
            <Trash2 size={15} />
            刪除
          </button>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <label className={labelClass}>
          訓練日期
          <input
            className={inputClass}
            disabled={!canEdit || isPending}
            type="date"
            {...register("date")}
          />
          <FieldError message={errors.date?.message} />
        </label>

        <label className={labelClass}>
          訓練類型
          <select
            className={inputClass}
            disabled={!canEdit || isPending}
            {...register("trainingType")}
          >
            <option value="">請選擇</option>
            <option value="easy">輕鬆跑</option>
            <option value="long_run">長跑</option>
            <option value="tempo">節奏跑</option>
            <option value="interval">間歇</option>
            <option value="rest">休息</option>
            <option value="cross_training">交叉訓練</option>
            <option value="race">比賽</option>
          </select>
          <FieldError message={errors.trainingType?.message} />
        </label>

        <label className={labelClass}>
          目標強度
          <input
            className={inputClass}
            disabled={!canEdit || isPending}
            placeholder="例如：RPE 4 / Z2 / 高"
            {...register("targetIntensity")}
          />
        </label>

        <label className={labelClass}>
          目標距離（公里）
          <input
            className={inputClass}
            disabled={!canEdit || isPending}
            inputMode="decimal"
            {...register("targetDistanceKm")}
          />
          <FieldError message={errors.targetDistanceKm?.message} />
        </label>

        <label className={labelClass}>
          目標時間（分鐘）
          <input
            className={inputClass}
            disabled={!canEdit || isPending}
            inputMode="numeric"
            {...register("targetDurationMin")}
          />
          <FieldError message={errors.targetDurationMin?.message} />
        </label>

        <label className={labelClass}>
          目標配速
          <input
            className={inputClass}
            disabled={!canEdit || isPending}
            placeholder="例如：6:20/km"
            {...register("targetPace")}
          />
        </label>

        <label className={`${labelClass} md:col-span-3`}>
          訓練說明
          <textarea
            className={`${inputClass} min-h-20 resize-y`}
            disabled={!canEdit || isPending}
            placeholder="例如：熱身 10 分鐘後輕鬆跑，最後做伸展。"
            {...register("description")}
          />
        </label>

        <label className={`${labelClass} md:col-span-2`}>
          注意事項
          <textarea
            className={`${inputClass} min-h-20 resize-y`}
            disabled={!canEdit || isPending}
            placeholder="例如：若膝蓋不適，改為快走或休息。"
            {...register("notes")}
          />
        </label>

        <label className={labelClass}>
          恢復建議
          <textarea
            className={`${inputClass} min-h-20 resize-y`}
            disabled={!canEdit || isPending}
            placeholder="例如：補水、伸展、睡眠優先。"
            {...register("recoverySuggestion")}
          />
        </label>
      </div>

      <div className="mt-6 border-t border-line pt-5">
        <h5 className="text-sm font-semibold text-foreground">每日營養建議</h5>
        <p className="mt-1 text-xs leading-5 text-muted">
          請填寫訓練搭配方向，例如碳水、蛋白質、水分與補給重點；內容需標示為估算，不應作為醫療或營養師診斷。
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className={labelClass}>
            碳水建議
            <input
              className={inputClass}
              disabled={!canEdit || isPending}
              {...register("carbSuggestion")}
            />
          </label>

          <label className={labelClass}>
            蛋白質建議
            <input
              className={inputClass}
              disabled={!canEdit || isPending}
              {...register("proteinSuggestion")}
            />
          </label>

          <label className={labelClass}>
            水分補充
            <input
              className={inputClass}
              disabled={!canEdit || isPending}
              {...register("hydrationSuggestion")}
            />
          </label>

          <label className={labelClass}>
            訓練前飲食
            <input
              className={inputClass}
              disabled={!canEdit || isPending}
              {...register("preWorkoutSuggestion")}
            />
          </label>

          <label className={labelClass}>
            訓練後恢復
            <input
              className={inputClass}
              disabled={!canEdit || isPending}
              {...register("postWorkoutSuggestion")}
            />
          </label>

          <label className={labelClass}>
            長跑補給
            <input
              className={inputClass}
              disabled={!canEdit || isPending}
              {...register("longRunFuelSuggestion")}
            />
          </label>

          <label className={labelClass}>
            休息日飲食
            <input
              className={inputClass}
              disabled={!canEdit || isPending}
              {...register("restDaySuggestion")}
            />
          </label>

          <label className={labelClass}>
            估算說明
            <input
              className={inputClass}
              disabled={!canEdit || isPending}
              placeholder="例如：方向性建議，非精準熱量計算。"
              {...register("estimateNote")}
            />
          </label>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p
          className={`text-sm ${
            result ? (result.ok ? "text-primary" : "text-danger") : "text-muted"
          }`}
        >
          {result?.message ??
            (canEdit
              ? "草稿版本可新增或修改每日內容。"
              : "此版本已確認或封存，不能直接修改。")}
        </p>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!canEdit || isPending}
          type="submit"
        >
          <Save size={16} />
          {isPending ? "儲存中" : "儲存每日內容"}
        </button>
      </div>
    </form>
  );
}
