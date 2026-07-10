import { PageShell } from "@/components/layout/page-shell";
import {
  TrainingCalendarView,
  type CalendarPlanData
} from "@/components/training/training-calendar-view";
import { prisma } from "@/lib/prisma";

const toDateInput = (value: Date | null | undefined) =>
  value ? value.toISOString().slice(0, 10) : "";

const getLocalDateInput = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const trainingTypeLabels: Record<string, string> = {
  easy: "輕鬆跑",
  long_run: "長跑",
  tempo: "節奏跑",
  interval: "間歇",
  rest: "休息",
  cross_training: "交叉訓練",
  race: "比賽"
};

const completionStatusLabels: Record<string, string> = {
  planned: "已安排",
  completed: "已完成",
  partial: "部分完成",
  missed: "未完成",
  changed: "已調整",
  rest: "休息"
};

async function getCalendarPlan(): Promise<CalendarPlanData | null> {
  const plan = await prisma.trainingPlan.findFirst({
    where: { status: "active" },
    include: {
      trainingGoal: true,
      versions: {
        include: {
          trainingDays: {
            include: {
              nutritionSuggestion: true,
              workoutLogs: {
                orderBy: { createdAt: "desc" },
                take: 1
              },
              foodLogs: {
                orderBy: { createdAt: "desc" }
              }
            },
            orderBy: { date: "asc" }
          }
        },
        orderBy: { versionNumber: "asc" }
      }
    },
    orderBy: { updatedAt: "desc" }
  });

  if (!plan) {
    return null;
  }

  const activeVersion =
    plan.versions.find((version) => version.id === plan.activeVersionId) ?? null;

  return {
    id: plan.id,
    title: plan.title,
    status: plan.status,
    startDate: toDateInput(plan.startDate),
    endDate: toDateInput(plan.endDate),
    goalLabel: plan.trainingGoal
      ? `${plan.trainingGoal.targetDistance}${
          plan.trainingGoal.raceName ? ` / ${plan.trainingGoal.raceName}` : ""
        }`
      : "未連結目標",
    activeVersion: activeVersion
      ? {
          id: activeVersion.id,
          versionNumber: activeVersion.versionNumber,
          summary: activeVersion.summary,
          status: activeVersion.status,
          trainingDays: activeVersion.trainingDays.map((day) => {
            const latestWorkoutLog = day.workoutLogs[0] ?? null;

            return {
              id: day.id,
              userProfileId: plan.userProfileId,
              date: toDateInput(day.date),
              trainingType: day.trainingType,
              trainingTypeLabel: trainingTypeLabels[day.trainingType] ?? day.trainingType,
              targetDistanceKm: day.targetDistanceKm,
              targetDurationMin: day.targetDurationMin,
              targetPace: day.targetPace,
              targetIntensity: day.targetIntensity,
              description: day.description,
              notes: day.notes,
              recoverySuggestion: day.recoverySuggestion,
              completionStatus: day.completionStatus,
              statusLabel:
                completionStatusLabels[day.completionStatus] ?? day.completionStatus,
              nutritionSuggestion: day.nutritionSuggestion
                ? {
                    carbSuggestion: day.nutritionSuggestion.carbSuggestion,
                    proteinSuggestion: day.nutritionSuggestion.proteinSuggestion,
                    hydrationSuggestion: day.nutritionSuggestion.hydrationSuggestion,
                    preWorkoutSuggestion: day.nutritionSuggestion.preWorkoutSuggestion,
                    postWorkoutSuggestion: day.nutritionSuggestion.postWorkoutSuggestion,
                    longRunFuelSuggestion:
                      day.nutritionSuggestion.longRunFuelSuggestion,
                    restDaySuggestion: day.nutritionSuggestion.restDaySuggestion,
                    estimateNote: day.nutritionSuggestion.estimateNote
                  }
                : null,
              latestWorkoutLog: latestWorkoutLog
                ? {
                    id: latestWorkoutLog.id,
                    logDate: toDateInput(latestWorkoutLog.logDate),
                    rawInput: latestWorkoutLog.rawInput,
                    workoutType: latestWorkoutLog.workoutType,
                    distanceKm: latestWorkoutLog.distanceKm,
                    durationMin: latestWorkoutLog.durationMin,
                    pace: latestWorkoutLog.pace,
                    heartRateAvg: latestWorkoutLog.heartRateAvg,
                    fatigueScore: latestWorkoutLog.fatigueScore,
                    painLocation: latestWorkoutLog.painLocation,
                    painScore: latestWorkoutLog.painScore,
                    completionStatus: latestWorkoutLog.completionStatus
                  }
                : null,
              foodLogs: day.foodLogs.map((foodLog) => ({
                id: foodLog.id,
                logDate: toDateInput(foodLog.logDate),
                rawInput: foodLog.rawInput,
                mealType: foodLog.mealType,
                foodItemsJson: foodLog.foodItemsJson,
                estimatedCarbsG: foodLog.estimatedCarbsG,
                estimatedProteinG: foodLog.estimatedProteinG,
                estimatedCalories: foodLog.estimatedCalories,
                estimateNote: foodLog.estimateNote
              }))
            };
          })
        }
      : null
  };
}

export default async function CalendarPage() {
  const plan = await getCalendarPlan();
  const today = new Date();
  const todayDate = getLocalDateInput(today);
  const todayLabel = today.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long"
  });

  return (
    <PageShell
      eyebrow="Calendar"
      title="訓練月曆"
      description="查看目前執行中的訓練計畫，並用年、月、週、日檢視整體安排。點擊日期後可查看當天完整訓練內容、營養建議與回報訓練結果。"
    >
      <TrainingCalendarView plan={plan} todayDate={todayDate} todayLabel={todayLabel} />
    </PageShell>
  );
}
