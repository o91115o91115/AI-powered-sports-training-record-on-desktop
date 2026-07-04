"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import {
  type PlannerActionResult,
  createTrainingPlan
} from "@/app/planner/actions";
import {
  type TrainingPlanFormValues,
  trainingPlanFormSchema
} from "@/schemas/forms/training-plan";

type TrainingPlanFormProps = {
  initialValues: TrainingPlanFormValues;
  disabled?: boolean;
};

const inputClass =
  "mt-2 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";
const labelClass = "text-sm font-medium text-foreground";
const errorClass = "mt-1 text-xs font-medium text-danger";

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className={errorClass}>{message}</p>;
}

export function TrainingPlanForm({ initialValues, disabled }: TrainingPlanFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<PlannerActionResult | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<TrainingPlanFormValues>({
    defaultValues: initialValues,
    resolver: zodResolver(trainingPlanFormSchema)
  });

  const onSubmit = (values: TrainingPlanFormValues) => {
    setResult(null);
    startTransition(async () => {
      const actionResult = await createTrainingPlan(values);
      setResult(actionResult);

      if (actionResult.ok) {
        reset({
          ...initialValues,
          title: "",
          startDate: "",
          endDate: ""
        });
        router.refresh();
      }
    });
  };

  return (
    <form
      className="rounded-lg border border-line bg-panel p-6"
      onSubmit={handleSubmit(onSubmit)}
    >
      <input type="hidden" {...register("userProfileId")} />
      <input type="hidden" {...register("trainingGoalId")} />

      <div className="border-b border-line pb-4">
        <h2 className="text-lg font-semibold text-foreground">建立訓練計畫草稿</h2>
        <p className="mt-1 text-sm text-muted">
          第三階段先建立手動計畫資料，AI 產生草稿會在後續階段接上。
        </p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <label className={`${labelClass} md:col-span-3`}>
          計畫名稱
          <input
            className={inputClass}
            disabled={disabled || isPending}
            placeholder="例如：2026 秋季全馬訓練計畫"
            {...register("title")}
          />
          <FieldError message={errors.title?.message} />
        </label>

        <label className={labelClass}>
          開始日期
          <input
            className={inputClass}
            disabled={disabled || isPending}
            type="date"
            {...register("startDate")}
          />
          <FieldError message={errors.startDate?.message} />
        </label>

        <label className={labelClass}>
          結束日期
          <input
            className={inputClass}
            disabled={disabled || isPending}
            type="date"
            {...register("endDate")}
          />
          <FieldError message={errors.endDate?.message} />
        </label>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p
          className={`text-sm ${
            result ? (result.ok ? "text-primary" : "text-danger") : "text-muted"
          }`}
        >
          {result?.message ??
            (disabled ? "請先完成目標設定，再建立訓練計畫。" : "建立後可再新增版本與每日內容。")}
        </p>

        <button
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled || isPending}
          type="submit"
        >
          <Plus size={16} />
          {isPending ? "建立中" : "建立計畫"}
        </button>
      </div>
    </form>
  );
}
