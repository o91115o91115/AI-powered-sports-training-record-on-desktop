"use client";

import { Activity, Pencil, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  deleteWorkoutLog,
  type CalendarActionResult
} from "@/app/calendar/actions";
import { WorkoutLogForm } from "@/components/training/workout-log-form";
import type { WorkoutLogFormValues } from "@/schemas/forms/workout-log";

export type WorkoutLogManagerItem = {
  id: string;
  trainingDayId: string | null;
  logDate: string;
  rawInput: string;
  workoutType: string | null;
  distanceKm: number | null;
  durationMin: number | null;
  pace: string | null;
  heartRateAvg: number | null;
  fatigueScore: number | null;
  painLocation: string | null;
  painScore: number | null;
  completionStatus: string | null;
  isFromCurrentTrainingDay: boolean;
};

type WorkoutLogManagerProps = {
  canReport: boolean;
  dateLabel: string;
  initialValues: WorkoutLogFormValues;
  isNewlyCreated?: boolean;
  workoutLog: WorkoutLogManagerItem | null;
};

const completionStatusLabels: Record<string, string> = {
  completed: "已完成",
  partial: "部分完成",
  missed: "未完成",
  changed: "已調整",
  rest: "休息"
};

const valueOrEmpty = (value: string | number | null | undefined) =>
  value === null || value === undefined || String(value).trim() === ""
    ? "未提供"
    : String(value);

export function WorkoutLogManager({
  canReport,
  dateLabel,
  initialValues,
  isNewlyCreated = false,
  workoutLog
}: WorkoutLogManagerProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [result, setResult] = useState<CalendarActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!workoutLog || !window.confirm("確定要刪除這筆訓練紀錄嗎？")) {
      return;
    }

    setResult(null);
    startTransition(async () => {
      const response = await deleteWorkoutLog({
        workoutLogId: workoutLog.id,
        trainingDayId: initialValues.trainingDayId,
        userProfileId: initialValues.userProfileId
      });
      setResult(response);

      if (response.ok) {
        setIsEditing(false);
        router.refresh();
      }
    });
  };

  return (
    <>
      <div
        className={`rounded-lg border p-4 ${
          isNewlyCreated
            ? "border-primary bg-primary/10"
            : "border-line bg-panel"
        }`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Activity size={16} className="text-primary" />
              <h3 className="font-semibold text-foreground">實際訓練紀錄</h3>
              {workoutLog && isNewlyCreated ? (
                <span className="rounded-md bg-primary px-2 py-1 text-xs font-semibold text-white">
                  本次新增
                </span>
              ) : null}
              {workoutLog && !workoutLog.isFromCurrentTrainingDay ? (
                <span className="rounded-md bg-accent/10 px-2 py-1 text-xs font-semibold text-accent">
                  建立於舊版計畫
                </span>
              ) : null}
            </div>
            {!workoutLog ? (
              <p className="mt-2 text-sm leading-6 text-muted">
                尚未記錄這一天的實際訓練結果。
              </p>
            ) : null}
          </div>

          {workoutLog && canReport ? (
            <div className="flex shrink-0 gap-2">
              <button
                className="inline-flex items-center gap-1 rounded-md border border-line bg-background px-3 py-2 text-xs font-semibold text-foreground transition hover:border-primary"
                onClick={() => {
                  setResult(null);
                  setIsEditing(true);
                }}
                type="button"
              >
                <Pencil size={14} />
                編輯
              </button>
              <button
                className="inline-flex items-center gap-1 rounded-md border border-line bg-background px-3 py-2 text-xs font-semibold text-danger transition hover:border-danger disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isPending}
                onClick={handleDelete}
                type="button"
              >
                <Trash2 size={14} />
                {isPending ? "刪除中" : "刪除"}
              </button>
            </div>
          ) : null}
        </div>

        {workoutLog ? (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <p className="text-sm text-foreground">
                類型：{valueOrEmpty(workoutLog.workoutType)}
              </p>
              <p className="text-sm text-foreground">
                狀態：
                {workoutLog.completionStatus
                  ? (completionStatusLabels[workoutLog.completionStatus] ??
                    workoutLog.completionStatus)
                  : "未提供"}
              </p>
              <p className="text-sm text-foreground">
                距離：
                {workoutLog.distanceKm !== null
                  ? `${workoutLog.distanceKm} km`
                  : "未提供"}
              </p>
              <p className="text-sm text-foreground">
                時間：
                {workoutLog.durationMin !== null
                  ? `${workoutLog.durationMin} 分鐘`
                  : "未提供"}
              </p>
              <p className="text-sm text-foreground">
                配速：{valueOrEmpty(workoutLog.pace)}
              </p>
              <p className="text-sm text-foreground">
                疲勞：{valueOrEmpty(workoutLog.fatigueScore)}
              </p>
              <p className="text-sm text-foreground">
                疼痛：{valueOrEmpty(workoutLog.painScore)}
                {workoutLog.painLocation ? ` / ${workoutLog.painLocation}` : ""}
              </p>
            </div>
            <p className="mt-3 rounded-md border border-line bg-background p-3 text-sm leading-6 text-muted">
              {workoutLog.rawInput}
            </p>
          </>
        ) : null}

        {result ? (
          <p
            className={`mt-3 text-sm ${result.ok ? "text-primary" : "text-danger"}`}
          >
            {result.message}
          </p>
        ) : null}
      </div>

      {isEditing && workoutLog ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            aria-label="關閉訓練紀錄編輯"
            className="absolute inset-0 bg-foreground/35"
            onClick={() => setIsEditing(false)}
            type="button"
          />
          <aside
            aria-label="編輯實際訓練紀錄"
            aria-modal="true"
            className="relative h-full w-full overflow-y-auto bg-background p-4 shadow-2xl sm:max-w-2xl sm:p-6"
            role="dialog"
          >
            <div className="mb-3 flex justify-end">
              <button
                aria-label="關閉編輯表單"
                className="rounded-md border border-line bg-panel p-2 text-foreground"
                onClick={() => setIsEditing(false)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>
            <WorkoutLogForm
              canReport={canReport}
              dateLabel={dateLabel}
              initialValues={initialValues}
              onCancel={() => setIsEditing(false)}
              onSaved={() => setIsEditing(false)}
            />
          </aside>
        </div>
      ) : null}
    </>
  );
}
