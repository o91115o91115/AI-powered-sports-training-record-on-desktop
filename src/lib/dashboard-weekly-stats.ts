export type WeeklyTrainingDay = {
  date: Date;
  trainingType: string;
};

export type WeeklyWorkoutLog = {
  completionStatus: string | null;
  distanceKm: number | null;
  logDate: Date;
  sportCategory: string | null;
  workoutType: string | null;
};

type CalculateWeeklyTrainingStatsInput = {
  endDate: string;
  startDate: string;
  trainingDays: WeeklyTrainingDay[];
  workoutLogs: WeeklyWorkoutLog[];
};

const runningWorkoutTypes = new Set([
  "easy",
  "interval",
  "long_run",
  "race",
  "run",
  "running",
  "tempo",
  "比賽",
  "跑步",
  "長跑",
  "節奏跑",
  "輕鬆跑",
  "間歇"
]);

const toDateInput = (value: Date) => value.toISOString().slice(0, 10);

const isInRange = (date: string, startDate: string, endDate: string) =>
  date >= startDate && date <= endDate;

export function isRunningWorkoutType(value: string | null) {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return false;
  }

  return runningWorkoutTypes.has(normalized) || normalized.includes("跑");
}

export function isRunningWorkout(
  sportCategory: string | null,
  workoutType: string | null
) {
  return (
    sportCategory === "running" ||
    (!sportCategory && isRunningWorkoutType(workoutType))
  );
}

export function calculateWeeklyTrainingStats({
  endDate,
  startDate,
  trainingDays,
  workoutLogs
}: CalculateWeeklyTrainingStatsInput) {
  const plannedDates = new Set(
    trainingDays
      .filter((day) => {
        const date = toDateInput(day.date);
        return (
          day.trainingType !== "rest" && isInRange(date, startDate, endDate)
        );
      })
      .map((day) => toDateInput(day.date))
  );

  // 同一計畫日可能有多筆實際運動，但完成率每個計畫日最多只計算一次。
  const completedDates = new Set(
    workoutLogs
      .filter(
        (log) =>
          log.completionStatus === "completed" &&
          plannedDates.has(toDateInput(log.logDate))
      )
      .map((log) => toDateInput(log.logDate))
  );

  const distanceKm = workoutLogs
    .filter((log) => {
      const date = toDateInput(log.logDate);
      return (
        isInRange(date, startDate, endDate) &&
        isRunningWorkout(log.sportCategory, log.workoutType)
      );
    })
    .reduce((total, log) => total + (log.distanceKm ?? 0), 0);

  const plannedCount = plannedDates.size;
  const completedCount = Math.min(completedDates.size, plannedCount);

  return {
    completedCount,
    completionRate:
      plannedCount > 0
        ? Math.min(100, Math.round((completedCount / plannedCount) * 100))
        : 0,
    distanceKm: Number(distanceKm.toFixed(1)),
    plannedCount
  };
}
