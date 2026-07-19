import { describe, expect, it } from "vitest";

import {
  calculateWeeklyTrainingStats,
  isRunningWorkout,
  isRunningWorkoutType,
  type WeeklyTrainingDay,
  type WeeklyWorkoutLog
} from "./dashboard-weekly-stats";

const date = (value: string) => new Date(`${value}T00:00:00.000Z`);

const trainingDays: WeeklyTrainingDay[] = [
  { date: date("2026-07-13"), trainingType: "tempo" },
  { date: date("2026-07-15"), trainingType: "rest" },
  { date: date("2026-07-17"), trainingType: "cross_training" }
];

const log = (
  logDate: string,
  overrides: Partial<WeeklyWorkoutLog> = {}
): WeeklyWorkoutLog => ({
  completionStatus: "completed",
  distanceKm: 5,
  logDate: date(logDate),
  sportCategory: null,
  workoutType: "跑步",
  ...overrides
});

const calculate = (
  workoutLogs: WeeklyWorkoutLog[],
  days: WeeklyTrainingDay[] = trainingDays
) =>
  calculateWeeklyTrainingStats({
    endDate: "2026-07-19",
    startDate: "2026-07-13",
    trainingDays: days,
    workoutLogs
  });

describe("calculateWeeklyTrainingStats", () => {
  it("excludes rest-day workouts from plan completion", () => {
    const result = calculate([log("2026-07-13"), log("2026-07-15")]);

    expect(result).toEqual({
      completedCount: 1,
      completionRate: 50,
      distanceKm: 10,
      plannedCount: 2
    });
  });

  it("counts the same planned date at most once", () => {
    const result = calculate([
      log("2026-07-13"),
      log("2026-07-13", { distanceKm: 1, workoutType: "游泳" }),
      log("2026-07-17", { workoutType: "游泳" })
    ]);

    expect(result.completedCount).toBe(2);
    expect(result.completionRate).toBe(100);
  });

  it("does not treat partial, changed, or missed logs as completed", () => {
    const result = calculate([
      log("2026-07-13", { completionStatus: "partial" }),
      log("2026-07-13", { completionStatus: "changed" }),
      log("2026-07-17", { completionStatus: "missed" })
    ]);

    expect(result.completedCount).toBe(0);
    expect(result.completionRate).toBe(0);
  });

  it("ignores completed logs outside the active plan dates", () => {
    const result = calculate([log("2026-07-14"), log("2026-07-18")]);

    expect(result.completedCount).toBe(0);
    expect(result.completionRate).toBe(0);
  });

  it("returns zero completion when the week has no planned training", () => {
    const result = calculate([log("2026-07-13")], []);

    expect(result.plannedCount).toBe(0);
    expect(result.completedCount).toBe(0);
    expect(result.completionRate).toBe(0);
  });

  it("excludes non-running distance from weekly running mileage", () => {
    const result = calculate([
      log("2026-07-13", { distanceKm: 9.5, workoutType: "running" }),
      log("2026-07-17", { distanceKm: 1, workoutType: "游泳" }),
      log("2026-07-19", { distanceKm: 5, workoutType: "跑步" })
    ]);

    expect(result.distanceKm).toBe(14.5);
  });
});

describe("isRunningWorkoutType", () => {
  it.each(["跑步", "running", "easy", "long_run", "節奏跑"])(
    "recognizes %s as running",
    (workoutType) => {
      expect(isRunningWorkoutType(workoutType)).toBe(true);
    }
  );

  it.each(["游泳", "cycling", "cross_training", null])(
    "does not recognize %s as running",
    (workoutType) => {
      expect(isRunningWorkoutType(workoutType)).toBe(false);
    }
  );

  it("優先使用標準分類判斷跑量", () => {
    expect(isRunningWorkout("running", "未填類型")).toBe(true);
    expect(isRunningWorkout("swimming", "跑步")).toBe(false);
  });
});
