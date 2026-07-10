"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { Bot, Loader2, Send } from "lucide-react";

import {
  saveAiDailyLog,
  type DailyLogAiActionResult,
  type DailyLogAiFormValues
} from "@/app/calendar/ai-log-actions";

type DailyLogAiFormProps = {
  canReport: boolean;
  dateLabel: string;
  initialValues: DailyLogAiFormValues;
};

const mealTypeLabels: Record<string, string> = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
  pre_workout: "訓練前",
  post_workout: "訓練後",
  fuel: "補給",
  snack: "點心",
  other: "其他"
};

const completionStatusLabels: Record<string, string> = {
  completed: "已完成",
  partial: "部分完成",
  missed: "未完成",
  changed: "已調整",
  rest: "休息"
};

const valueOrDash = (value: string | number | null | undefined) =>
  value === null || value === undefined || String(value).trim() === ""
    ? "未解析"
    : String(value);

export function DailyLogAiForm({
  canReport,
  dateLabel,
  initialValues
}: DailyLogAiFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [text, setText] = useState(initialValues.text);
  const [result, setResult] = useState<DailyLogAiActionResult | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload: DailyLogAiFormValues = {
      ...initialValues,
      text
    };

    startTransition(async () => {
      const response = await saveAiDailyLog(payload);
      setResult(response);

      if (response.ok) {
        setText("");
        router.refresh();
      }
    });
  };

  return (
    <form className="rounded-lg border border-line bg-panel p-4" onSubmit={handleSubmit}>
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-background text-primary">
          <Bot size={18} />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">AI 紀錄解析</h3>
          <p className="mt-1 text-sm leading-6 text-muted">
            {dateLabel} 的訓練與飲食可用一句話輸入，AI 會解析後寫入本日紀錄。
          </p>
        </div>
      </div>

      <textarea
        className="mt-4 min-h-28 w-full resize-y rounded-md border border-line bg-background px-3 py-2 text-sm leading-6 text-foreground outline-none transition focus:border-primary"
        disabled={!canReport || isPending}
        onChange={(event) => setText(event.target.value)}
        placeholder="例：今天跑 8 公里 48 分鐘，疲勞 6 分，左膝有點痛 2 分；跑後吃香蕉、豆漿和飯糰。"
        value={text}
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs leading-5 text-muted">
          送出後會顯示 AI 解析出的欄位，再同步寫入本日訓練與飲食紀錄。
        </p>
        <button
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!canReport || isPending || text.trim().length === 0}
          type="submit"
        >
          {isPending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
          AI 解析並儲存
        </button>
      </div>

      {result ? (
        <div
          className={`mt-4 rounded-md border p-3 text-sm leading-6 ${
            result.ok
              ? "border-primary/30 bg-primary/10 text-foreground"
              : "border-danger/30 bg-danger/10 text-danger"
          }`}
        >
          <p className="font-semibold">{result.message}</p>

          {result.parsedWorkout ? (
            <div className="mt-3 rounded-md border border-line bg-background p-3">
              <p className="text-xs font-semibold text-muted">AI 解析訓練結果</p>
              <div className="mt-2 grid gap-2 text-sm text-foreground md:grid-cols-3">
                <p>類型：{valueOrDash(result.parsedWorkout.workoutType)}</p>
                <p>距離：{valueOrDash(result.parsedWorkout.distanceKm)} km</p>
                <p>時間：{valueOrDash(result.parsedWorkout.durationMin)} 分鐘</p>
                <p>配速：{valueOrDash(result.parsedWorkout.pace)}</p>
                <p>疲勞：{valueOrDash(result.parsedWorkout.fatigueScore)}</p>
                <p>
                  狀態：
                  {result.parsedWorkout.completionStatus
                    ? completionStatusLabels[result.parsedWorkout.completionStatus] ??
                      result.parsedWorkout.completionStatus
                    : "未解析"}
                </p>
              </div>
              {result.parsedWorkout.painScore || result.parsedWorkout.painLocation ? (
                <p className="mt-2 text-sm text-danger">
                  疼痛：{valueOrDash(result.parsedWorkout.painScore)}
                  {result.parsedWorkout.painLocation
                    ? ` / ${result.parsedWorkout.painLocation}`
                    : ""}
                </p>
              ) : null}
            </div>
          ) : null}

          {result.parsedNutrition ? (
            <div className="mt-3 rounded-md border border-line bg-background p-3">
              <p className="text-xs font-semibold text-muted">AI 解析飲食結果</p>
              <div className="mt-2 grid gap-2 text-sm text-foreground md:grid-cols-2">
                <p>
                  餐別：
                  {result.parsedNutrition.mealType
                    ? mealTypeLabels[result.parsedNutrition.mealType] ??
                      result.parsedNutrition.mealType
                    : "未分類"}
                </p>
                <p>
                  食物：
                  {result.parsedNutrition.foodItems.length > 0
                    ? result.parsedNutrition.foodItems.join("、")
                    : "未解析"}
                </p>
                <p>碳水：{valueOrDash(result.parsedNutrition.estimatedCarbsG)} g</p>
                <p>蛋白質：{valueOrDash(result.parsedNutrition.estimatedProteinG)} g</p>
                <p>熱量：{valueOrDash(result.parsedNutrition.estimatedCalories)} kcal</p>
              </div>
              {result.parsedNutrition.estimateNote ? (
                <p className="mt-2 text-xs leading-5 text-muted">
                  {result.parsedNutrition.estimateNote}
                </p>
              ) : null}
            </div>
          ) : null}

          {result.safetyNote ? (
            <p className="mt-3 rounded-md border border-danger/30 bg-background p-2 text-danger">
              {result.safetyNote}
            </p>
          ) : null}
          {result.missingInformation.length > 0 ? (
            <p className="mt-2 text-xs text-muted">
              需要補充：{result.missingInformation.join("、")}
            </p>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
