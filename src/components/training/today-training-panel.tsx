"use client";

import { CalendarCheck, Footprints, Timer } from "lucide-react";
import { useState } from "react";

import type { DailyLogAiFormValues } from "@/app/calendar/ai-log-actions";
import {
  AiFeedbackPanel,
  type AiFeedbackPanelData
} from "@/components/training/ai-feedback-panel";
import { DailyLogAiForm } from "@/components/training/daily-log-ai-form";
import {
  FoodLogManager,
  type FoodLogManagerItem
} from "@/components/training/food-log-manager";
import {
  NutritionSuggestionPanel,
  type NutritionSuggestionPanelData
} from "@/components/training/nutrition-suggestion-panel";
import {
  WorkoutLogManager,
  type WorkoutLogManagerItem
} from "@/components/training/workout-log-manager";
import {
  emptyFoodLogValues,
  type FoodLogFormValues
} from "@/schemas/forms/food-log";
import {
  emptyWorkoutLogValues,
  type WorkoutLogFormValues
} from "@/schemas/forms/workout-log";

export type WorkoutLogListItem = WorkoutLogManagerItem;

export type FoodLogListItem = FoodLogManagerItem;

export type TodayTrainingDay = {
  id: string;
  trainingPlanId: string;
  userProfileId: string;
  date: string;
  trainingType: string;
  trainingTypeLabel: string;
  targetDistanceKm: number | null;
  targetDurationMin: number | null;
  targetPace: string | null;
  targetIntensity: string | null;
  description: string | null;
  notes: string | null;
  recoverySuggestion: string | null;
  completionStatus: string;
  statusLabel: string;
  nutritionSuggestion: NutritionSuggestionPanelData | null;
  workoutLogs: WorkoutLogListItem[];
  foodLogs: FoodLogListItem[];
  latestAiFeedback: AiFeedbackPanelData | null;
};

type TodayTrainingPanelProps = {
  canReport: boolean;
  dateLabel: string;
  day: TodayTrainingDay | null;
  title?: string;
  emptyMessage?: string;
};

type RecentlyCreatedRecords = {
  trainingDayId: string;
  workoutLogIds: string[];
  foodLogIds: string[];
};

type RecordTab = "workout" | "food";

const valueOrEmpty = (value: string | number | null | undefined) =>
  value === null || value === undefined || String(value).trim() === ""
    ? "未提供"
    : String(value);

const toNumberText = (value: number | null | undefined) =>
  value === null || value === undefined ? "" : String(value);

const toCompletionStatus = (
  value: string | null | undefined
): WorkoutLogFormValues["completionStatus"] => {
  if (
    value === "completed" ||
    value === "partial" ||
    value === "missed" ||
    value === "changed" ||
    value === "rest"
  ) {
    return value;
  }

  return "completed";
};

const toWorkoutLogValues = (
  day: TodayTrainingDay,
  log: WorkoutLogListItem | null
): WorkoutLogFormValues => {
  return {
    ...emptyWorkoutLogValues,
    workoutLogId: log?.id ?? "",
    trainingDayId: log?.trainingDayId ?? day.id,
    userProfileId: day.userProfileId,
    logDate: log?.logDate ?? day.date,
    completionStatus: toCompletionStatus(
      log?.completionStatus ?? day.completionStatus
    ),
    workoutType: log?.workoutType ?? day.trainingType,
    distanceKm: toNumberText(log?.distanceKm),
    durationMin: toNumberText(log?.durationMin),
    pace: log?.pace ?? "",
    heartRateAvg: toNumberText(log?.heartRateAvg),
    fatigueScore: toNumberText(log?.fatigueScore),
    painLocation: log?.painLocation ?? "",
    painScore: toNumberText(log?.painScore),
    rawInput: log?.rawInput ?? ""
  };
};

const toFoodLogValues = (day: TodayTrainingDay): FoodLogFormValues => ({
  ...emptyFoodLogValues,
  foodLogId: "",
  trainingDayId: day.id,
  userProfileId: day.userProfileId,
  workoutLogId: day.workoutLogs[0]?.id ?? "",
  logDate: day.date
});

const toDailyLogAiValues = (day: TodayTrainingDay): DailyLogAiFormValues => ({
  trainingDayId: day.id,
  userProfileId: day.userProfileId,
  workoutLogId: day.workoutLogs[0]?.id ?? "",
  logDate: day.date,
  text: ""
});

export function TodayTrainingPanel({
  canReport,
  dateLabel,
  day,
  title = "今日任務",
  emptyMessage = "這一天沒有安排訓練。若這不是預期結果，請回到訓練計畫確認目前使用版本的日期範圍。"
}: TodayTrainingPanelProps) {
  const [recentlyCreated, setRecentlyCreated] =
    useState<RecentlyCreatedRecords | null>(null);
  const [activeRecordTab, setActiveRecordTab] = useState<RecordTab>("workout");

  if (!day) {
    return (
      <section className="rounded-lg border border-line bg-panel p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-md bg-background text-primary">
            <CalendarCheck size={18} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            <p className="text-sm text-muted">{dateLabel}</p>
          </div>
        </div>
        <p className="mt-4 rounded-md border border-line bg-background p-4 text-sm leading-6 text-muted">
          {emptyMessage}
        </p>
      </section>
    );
  }

  const currentRecentlyCreated =
    recentlyCreated?.trainingDayId === day.id ? recentlyCreated : null;

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-line bg-panel p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-accent">{title}</p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">
              {day.trainingTypeLabel}
            </h2>
            <p className="mt-1 text-sm text-muted">{dateLabel}</p>
          </div>
          <span className="w-fit rounded-md bg-background px-3 py-1.5 text-xs font-medium text-muted">
            {day.statusLabel}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
          <div className="rounded-md bg-background p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted">
              <Footprints size={14} />
              距離
            </div>
            <p className="mt-2 text-sm text-foreground">
              {day.targetDistanceKm ? `${day.targetDistanceKm} km` : "未提供"}
            </p>
          </div>
          <div className="rounded-md bg-background p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted">
              <Timer size={14} />
              時間
            </div>
            <p className="mt-2 text-sm text-foreground">
              {day.targetDurationMin
                ? `${day.targetDurationMin} 分鐘`
                : "未提供"}
            </p>
          </div>
          <div className="rounded-md bg-background p-3">
            <p className="text-xs font-semibold text-muted">強度</p>
            <p className="mt-2 text-sm text-foreground">
              {valueOrEmpty(day.targetIntensity)}
            </p>
          </div>
          <div className="rounded-md bg-background p-3">
            <p className="text-xs font-semibold text-muted">目標配速</p>
            <p className="mt-2 text-sm text-foreground">
              {valueOrEmpty(day.targetPace)}
            </p>
          </div>
        </div>

        <details className="group mt-3 rounded-md border border-line bg-background">
          <summary className="cursor-pointer list-none px-3 py-2 text-sm font-semibold text-foreground">
            查看訓練內容與恢復建議
            <span className="ml-2 text-xs font-normal text-muted group-open:hidden">
              展開
            </span>
            <span className="ml-2 hidden text-xs font-normal text-muted group-open:inline">
              收合
            </span>
          </summary>
          <div className="grid gap-3 border-t border-line p-3 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold text-muted">訓練內容</p>
              <p className="mt-2 text-sm leading-6 text-foreground">
                {valueOrEmpty(day.description)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted">恢復建議</p>
              <p className="mt-2 text-sm leading-6 text-foreground">
                {valueOrEmpty(day.recoverySuggestion)}
              </p>
            </div>
            {day.notes ? (
              <p className="text-sm leading-6 text-muted md:col-span-2">
                {day.notes}
              </p>
            ) : null}
          </div>
        </details>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(380px,0.92fr)]">
        <div className="order-2 space-y-4 xl:order-1">
          <NutritionSuggestionPanel
            nutritionSuggestion={day.nutritionSuggestion}
            trainingType={day.trainingType}
          />

          <AiFeedbackPanel
            canReport={canReport}
            feedback={day.latestAiFeedback}
            trainingPlanId={day.trainingPlanId}
            trainingDayId={day.id}
            userProfileId={day.userProfileId}
          />
        </div>

        <div className="order-1 space-y-4 xl:sticky xl:top-4 xl:order-2">
          {canReport ? (
            <DailyLogAiForm
              canReport={canReport}
              dateLabel={dateLabel}
              initialValues={toDailyLogAiValues(day)}
              onRecordsCreated={({ workoutLogIds, foodLogIds }) => {
                setRecentlyCreated({
                  trainingDayId: day.id,
                  workoutLogIds,
                  foodLogIds
                });

                if (workoutLogIds.length > 0) {
                  setActiveRecordTab("workout");
                } else if (foodLogIds.length > 0) {
                  setActiveRecordTab("food");
                }
              }}
              onSubmitStart={() => setRecentlyCreated(null)}
            />
          ) : null}

          <section className="rounded-lg border border-line bg-panel p-3">
            <div
              aria-label="實際紀錄類型"
              className="grid grid-cols-2 gap-2"
              role="tablist"
            >
              <button
                aria-selected={activeRecordTab === "workout"}
                className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                  activeRecordTab === "workout"
                    ? "bg-primary text-white"
                    : "bg-background text-foreground hover:bg-primary/10"
                }`}
                onClick={() => setActiveRecordTab("workout")}
                role="tab"
                type="button"
              >
                訓練紀錄 {day.workoutLogs.length}
                {currentRecentlyCreated?.workoutLogIds.length ? " •" : ""}
              </button>
              <button
                aria-selected={activeRecordTab === "food"}
                className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                  activeRecordTab === "food"
                    ? "bg-primary text-white"
                    : "bg-background text-foreground hover:bg-primary/10"
                }`}
                onClick={() => setActiveRecordTab("food")}
                role="tab"
                type="button"
              >
                飲食紀錄 {day.foodLogs.length}
                {currentRecentlyCreated?.foodLogIds.length ? " •" : ""}
              </button>
            </div>

            <div className="mt-3" role="tabpanel">
              {activeRecordTab === "workout" ? (
                day.workoutLogs.length > 0 ? (
                  <div className="space-y-3">
                    {day.workoutLogs.map((workoutLog) => (
                      <WorkoutLogManager
                        canReport={canReport}
                        dateLabel={dateLabel}
                        initialValues={toWorkoutLogValues(day, workoutLog)}
                        isNewlyCreated={
                          currentRecentlyCreated?.workoutLogIds.includes(
                            workoutLog.id
                          ) ?? false
                        }
                        key={workoutLog.id}
                        workoutLog={workoutLog}
                      />
                    ))}
                  </div>
                ) : (
                  <WorkoutLogManager
                    canReport={canReport}
                    dateLabel={dateLabel}
                    initialValues={toWorkoutLogValues(day, null)}
                    workoutLog={null}
                  />
                )
              ) : (
                <FoodLogManager
                  allowCreate={false}
                  canReport={canReport}
                  createInitialValues={toFoodLogValues(day)}
                  dateLabel={dateLabel}
                  foodLogs={day.foodLogs}
                  highlightedFoodLogIds={
                    currentRecentlyCreated?.foodLogIds ?? []
                  }
                />
              )}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
