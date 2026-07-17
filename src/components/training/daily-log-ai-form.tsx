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
  onRecordsCreated?: (records: {
    workoutLogIds: string[];
    foodLogIds: string[];
  }) => void;
  onSubmitStart?: () => void;
};

export function DailyLogAiForm({
  canReport,
  dateLabel,
  initialValues,
  onRecordsCreated,
  onSubmitStart
}: DailyLogAiFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [text, setText] = useState(initialValues.text);
  const [result, setResult] = useState<DailyLogAiActionResult | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResult(null);
    onSubmitStart?.();

    const payload: DailyLogAiFormValues = {
      ...initialValues,
      text
    };

    startTransition(async () => {
      const response = await saveAiDailyLog(payload);
      setResult(response);

      if (response.ok) {
        setText("");
        onRecordsCreated?.({
          workoutLogIds: response.createdWorkoutLogIds,
          foodLogIds: response.createdFoodLogIds
        });
        router.refresh();
      }
    });
  };

  return (
    <form
      className="rounded-lg border border-line bg-panel p-4"
      onSubmit={handleSubmit}
    >
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
        placeholder="例：今天跑 8 公里 48 分鐘；早餐吃吐司和豆漿，跑後吃香蕉和飯糰，晚餐吃雞胸肉便當。"
        value={text}
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs leading-5 text-muted">
          儲存完成後只回報新增筆數，詳細內容請查看下方實際紀錄。
        </p>
        <button
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!canReport || isPending || text.trim().length === 0}
          type="submit"
        >
          {isPending ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <Send size={16} />
          )}
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
