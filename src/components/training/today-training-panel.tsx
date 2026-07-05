import { Activity, CalendarCheck, Footprints, Timer } from "lucide-react";

import {
  NutritionSuggestionPanel,
  type NutritionSuggestionPanelData
} from "@/components/training/nutrition-suggestion-panel";
import { WorkoutLogForm } from "@/components/training/workout-log-form";
import {
  emptyWorkoutLogValues,
  type WorkoutLogFormValues
} from "@/schemas/forms/workout-log";

export type LatestWorkoutLog = {
  id: string;
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
};

export type TodayTrainingDay = {
  id: string;
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
  latestWorkoutLog: LatestWorkoutLog | null;
};

type TodayTrainingPanelProps = {
  canReport: boolean;
  dateLabel: string;
  day: TodayTrainingDay | null;
  title?: string;
  emptyMessage?: string;
};

const valueOrEmpty = (value: string | number | null | undefined) =>
  value === null || value === undefined || String(value).trim() === ""
    ? "未設定"
    : String(value);

const toNumberText = (value: number | null | undefined) =>
  value === null || value === undefined ? "" : String(value);

const toCompletionStatus = (value: string | null | undefined): WorkoutLogFormValues["completionStatus"] => {
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

const toWorkoutLogValues = (day: TodayTrainingDay): WorkoutLogFormValues => {
  const log = day.latestWorkoutLog;

  return {
    ...emptyWorkoutLogValues,
    workoutLogId: log?.id ?? "",
    trainingDayId: day.id,
    userProfileId: day.userProfileId,
    logDate: log?.logDate ?? day.date,
    completionStatus: toCompletionStatus(log?.completionStatus ?? day.completionStatus),
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

function LatestWorkoutSummary({ log }: { log: LatestWorkoutLog | null }) {
  if (!log) {
    return (
      <div className="rounded-lg border border-line bg-panel p-4">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-primary" />
          <h3 className="font-semibold text-foreground">尚未回報訓練結果</h3>
        </div>
        <p className="mt-2 text-sm leading-6 text-muted">
          填寫下方紀錄後，月曆會更新這一天的完成狀態。
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-panel p-4">
      <div className="flex items-center gap-2">
        <Activity size={16} className="text-primary" />
        <h3 className="font-semibold text-foreground">最新訓練紀錄</h3>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-md border border-line bg-background p-3">
          <p className="text-xs font-semibold text-muted">距離</p>
          <p className="mt-2 text-sm text-foreground">
            {log.distanceKm ? `${log.distanceKm} km` : "未設定"}
          </p>
        </div>
        <div className="rounded-md border border-line bg-background p-3">
          <p className="text-xs font-semibold text-muted">時間</p>
          <p className="mt-2 text-sm text-foreground">
            {log.durationMin ? `${log.durationMin} 分鐘` : "未設定"}
          </p>
        </div>
        <div className="rounded-md border border-line bg-background p-3">
          <p className="text-xs font-semibold text-muted">疲勞</p>
          <p className="mt-2 text-sm text-foreground">{valueOrEmpty(log.fatigueScore)}</p>
        </div>
        <div className="rounded-md border border-line bg-background p-3">
          <p className="text-xs font-semibold text-muted">疼痛</p>
          <p className="mt-2 text-sm text-foreground">
            {valueOrEmpty(log.painScore)}
            {log.painLocation ? ` / ${log.painLocation}` : ""}
          </p>
        </div>
      </div>
      <p className="mt-3 rounded-md border border-line bg-background p-3 text-sm leading-6 text-muted">
        {log.rawInput}
      </p>
    </div>
  );
}

export function TodayTrainingPanel({
  canReport,
  dateLabel,
  day,
  title = "今日任務",
  emptyMessage = "這一天沒有安排訓練。若這不是預期結果，請回到訓練計畫確認 active version 的日期範圍。"
}: TodayTrainingPanelProps) {
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

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-line bg-panel p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold text-accent">{title}</p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">
              {day.trainingTypeLabel}
            </h2>
            <p className="mt-2 text-sm text-muted">{dateLabel}</p>
          </div>
          <span className="w-fit rounded-md bg-background px-3 py-2 text-xs font-medium text-muted">
            {day.statusLabel}
          </span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-md border border-line bg-background p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted">
              <Footprints size={14} />
              距離
            </div>
            <p className="mt-2 text-sm text-foreground">
              {day.targetDistanceKm ? `${day.targetDistanceKm} km` : "未設定"}
            </p>
          </div>
          <div className="rounded-md border border-line bg-background p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted">
              <Timer size={14} />
              時間
            </div>
            <p className="mt-2 text-sm text-foreground">
              {day.targetDurationMin ? `${day.targetDurationMin} 分鐘` : "未設定"}
            </p>
          </div>
          <div className="rounded-md border border-line bg-background p-3">
            <p className="text-xs font-semibold text-muted">強度 / 配速</p>
            <p className="mt-2 text-sm text-foreground">
              {valueOrEmpty(day.targetIntensity)} / {valueOrEmpty(day.targetPace)}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="rounded-md border border-line bg-background p-3">
            <p className="text-xs font-semibold text-muted">訓練內容</p>
            <p className="mt-2 text-sm leading-6 text-foreground">
              {valueOrEmpty(day.description)}
            </p>
          </div>
          <div className="rounded-md border border-line bg-background p-3">
            <p className="text-xs font-semibold text-muted">恢復提醒</p>
            <p className="mt-2 text-sm leading-6 text-foreground">
              {valueOrEmpty(day.recoverySuggestion)}
            </p>
          </div>
        </div>

        {day.notes ? (
          <p className="mt-4 rounded-md border border-line bg-background p-3 text-sm leading-6 text-muted">
            {day.notes}
          </p>
        ) : null}
      </div>

      <NutritionSuggestionPanel
        nutritionSuggestion={day.nutritionSuggestion}
        trainingType={day.trainingType}
      />

      {canReport ? (
        <>
          <LatestWorkoutSummary log={day.latestWorkoutLog} />
          <WorkoutLogForm
            canReport={canReport}
            dateLabel={dateLabel}
            initialValues={toWorkoutLogValues(day)}
          />
        </>
      ) : null}
    </section>
  );
}
