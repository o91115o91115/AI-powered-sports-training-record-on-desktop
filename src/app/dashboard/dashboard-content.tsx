import Link from "next/link";

import {
  DashboardCharts,
  type DashboardChartData
} from "@/components/dashboard/dashboard-charts";
import { PageShell } from "@/components/layout/page-shell";
import { prisma } from "@/lib/prisma";

const toDateInput = (value: Date | null | undefined) =>
  value ? value.toISOString().slice(0, 10) : "";

const getLocalDateInput = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const addDays = (value: Date, days: number) => {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
};

const getWeekStart = (value: Date) => {
  const start = new Date(value);
  const day = start.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + offset);
  return start;
};

const getRecentWeekStarts = (currentWeekStart: Date, count: number) =>
  Array.from({ length: count }, (_, index) => addDays(currentWeekStart, (index - count + 1) * 7));

const isDateInputInRange = (dateInput: string, startInput: string, endInput: string) =>
  dateInput >= startInput && dateInput <= endInput;

const buildDashboardChartData = ({
  activeDays,
  foodLogs,
  today,
  workoutLogs
}: {
  activeDays: Array<{
    date: Date;
    trainingType: string;
    completionStatus: string;
  }>;
  foodLogs: Array<{
    logDate: Date;
    estimatedCarbsG: number | null;
    estimatedProteinG: number | null;
    estimatedCalories: number | null;
  }>;
  today: Date;
  workoutLogs: Array<{
    logDate: Date;
    distanceKm: number | null;
    fatigueScore: number | null;
    painScore: number | null;
    completionStatus: string | null;
  }>;
}): DashboardChartData => {
  const currentWeekStart = getWeekStart(today);
  const weekStarts = getRecentWeekStarts(currentWeekStart, 8);

  const weeklyMileage = weekStarts.map((weekStart) => {
    const weekEnd = addDays(weekStart, 6);
    const startInput = getLocalDateInput(weekStart);
    const endInput = getLocalDateInput(weekEnd);
    const distanceKm = workoutLogs
      .filter((workoutLog) => isDateInputInRange(toDateInput(workoutLog.logDate), startInput, endInput))
      .reduce((total, workoutLog) => total + (workoutLog.distanceKm ?? 0), 0);

    return {
      week: startInput.slice(5),
      distanceKm: Number(distanceKm.toFixed(1))
    };
  });

  const completion = weekStarts.map((weekStart) => {
    const weekEnd = addDays(weekStart, 6);
    const startInput = getLocalDateInput(weekStart);
    const endInput = getLocalDateInput(weekEnd);
    const plannedDays = activeDays.filter(
      (day) =>
        day.trainingType !== "rest" &&
        isDateInputInRange(toDateInput(day.date), startInput, endInput)
    );
    const statusCounts = {
      changed: 0,
      completed: 0,
      missed: 0,
      partial: 0
    };

    for (const day of plannedDays) {
      const dateInput = toDateInput(day.date);
      const latestLog = workoutLogs.find(
        (workoutLog) => toDateInput(workoutLog.logDate) === dateInput
      );
      const status = latestLog?.completionStatus ?? day.completionStatus;

      if (status === "completed") {
        statusCounts.completed += 1;
      } else if (status === "partial") {
        statusCounts.partial += 1;
      } else if (status === "changed") {
        statusCounts.changed += 1;
      } else if (status === "missed") {
        statusCounts.missed += 1;
      }
    }

    return {
      week: startInput.slice(5),
      ...statusCounts
    };
  });

  const thirtyDaysAgoInput = getLocalDateInput(addDays(today, -29));
  const fatiguePain = workoutLogs
    .filter((workoutLog) => toDateInput(workoutLog.logDate) >= thirtyDaysAgoInput)
    .sort((first, second) => first.logDate.getTime() - second.logDate.getTime())
    .map((workoutLog) => ({
      date: toDateInput(workoutLog.logDate).slice(5),
      fatigueScore: workoutLog.fatigueScore,
      painScore: workoutLog.painScore
    }));

  const nutritionByDate = new Map<
    string,
    { calories: number; carbsG: number; date: string; proteinG: number }
  >();
  const fourteenDaysAgoInput = getLocalDateInput(addDays(today, -13));

  for (const foodLog of foodLogs) {
    const dateInput = toDateInput(foodLog.logDate);

    if (dateInput < fourteenDaysAgoInput) {
      continue;
    }

    const current =
      nutritionByDate.get(dateInput) ?? {
        calories: 0,
        carbsG: 0,
        date: dateInput.slice(5),
        proteinG: 0
      };

    current.carbsG += foodLog.estimatedCarbsG ?? 0;
    current.proteinG += foodLog.estimatedProteinG ?? 0;
    current.calories += foodLog.estimatedCalories ?? 0;
    nutritionByDate.set(dateInput, current);
  }

  return {
    completion,
    fatiguePain,
    nutrition: Array.from(nutritionByDate.entries())
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([, value]) => ({
        calories: Number(value.calories.toFixed(0)),
        carbsG: Number(value.carbsG.toFixed(1)),
        date: value.date,
        proteinG: Number(value.proteinG.toFixed(1))
      })),
    weeklyMileage
  };
};

const formatDate = (value: Date | null | undefined) =>
  value
    ? value.toLocaleDateString("zh-TW", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      })
    : "未提供";

const formatDateTime = (value: Date) =>
  value.toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });

const trainingTypeLabels: Record<string, string> = {
  easy: "輕鬆跑",
  long_run: "長跑",
  tempo: "節奏跑",
  interval: "間歇",
  rest: "休息",
  cross_training: "交叉訓練",
  race: "比賽"
};

export async function getDashboardData() {
  const plan = await prisma.trainingPlan.findFirst({
    where: { status: "active" },
    include: {
      trainingGoal: true,
      versions: {
        include: {
          trainingDays: {
            include: {
              nutritionSuggestion: true
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

  const activeVersion = plan.versions.find((version) => version.id === plan.activeVersionId) ?? null;
  const today = new Date();
  const todayDate = getLocalDateInput(today);
  const weekStart = getWeekStart(today);
  const weekEnd = addDays(weekStart, 6);
  const weekStartInput = getLocalDateInput(weekStart);
  const weekEndInput = getLocalDateInput(weekEnd);
  const activeDays = activeVersion?.trainingDays ?? [];
  const activeDateSet = new Set(activeDays.map((day) => toDateInput(day.date)));
  const thisWeekDays = activeDays.filter((day) => {
    const dateInput = toDateInput(day.date);
    return dateInput >= weekStartInput && dateInput <= weekEndInput;
  });
  const todayDay = activeDays.find((day) => toDateInput(day.date) === todayDate) ?? null;

  const [workoutLogs, foodLogs, feedback, adjustments] = await Promise.all([
    activeVersion
      ? prisma.workoutLog.findMany({
          where: { userProfileId: plan.userProfileId },
          orderBy: { createdAt: "desc" }
        })
      : Promise.resolve([]),
    activeVersion
      ? prisma.foodLog.findMany({
          where: { userProfileId: plan.userProfileId },
          orderBy: { createdAt: "desc" },
          take: 60
        })
      : Promise.resolve([]),
    prisma.aiFeedback.findMany({
      where: { userProfileId: plan.userProfileId },
      orderBy: { createdAt: "desc" },
      take: 5
    }),
    prisma.planAdjustment.findMany({
      where: {
        originalVersion: {
          trainingPlanId: plan.id
        }
      },
      include: {
        newVersion: true
      },
      orderBy: { createdAt: "desc" },
      take: 3
    })
  ]);

  const workoutLogsByDate = new Map<string, typeof workoutLogs>();
  for (const workoutLog of workoutLogs) {
    const dateInput = toDateInput(workoutLog.logDate);

    if (!activeDateSet.has(dateInput)) {
      continue;
    }

    const dateLogs = workoutLogsByDate.get(dateInput) ?? [];
    dateLogs.push(workoutLog);
    workoutLogsByDate.set(dateInput, dateLogs);
  }

  const weekWorkoutLogs = workoutLogs.filter((workoutLog) => {
    const dateInput = toDateInput(workoutLog.logDate);
    return dateInput >= weekStartInput && dateInput <= weekEndInput;
  });
  const completedWeekDates = new Set(weekWorkoutLogs.map((workoutLog) => toDateInput(workoutLog.logDate)));
  const plannedTrainingDays = thisWeekDays.filter((day) => day.trainingType !== "rest");
  const weeklyDistanceKm = weekWorkoutLogs.reduce(
    (total, workoutLog) => total + (workoutLog.distanceKm ?? 0),
    0
  );
  const highRiskWorkout = workoutLogs.find(
    (workoutLog) =>
      (workoutLog.painScore !== null && workoutLog.painScore >= 4) ||
      (workoutLog.fatigueScore !== null && workoutLog.fatigueScore >= 8)
  );
  const highRiskFeedback = feedback.find(
    (item) => item.shouldReplan || Boolean(item.riskWarning?.trim())
  );
  const latestWorkoutLog = todayDay
    ? workoutLogsByDate.get(toDateInput(todayDay.date))?.[0] ?? null
    : null;
  const latestFeedback = feedback[0] ?? null;

  return {
    plan: {
      title: plan.title,
      goalLabel: plan.trainingGoal
        ? `${plan.trainingGoal.targetDistance}${
            plan.trainingGoal.raceName ? ` / ${plan.trainingGoal.raceName}` : ""
          }`
        : "未連結目標",
      period: `${formatDate(plan.startDate)} - ${formatDate(plan.endDate)}`,
      activeVersionLabel: activeVersion
        ? `V${activeVersion.versionNumber}`
        : "尚未套用計畫版本"
    },
    today: {
      label: today.toLocaleDateString("zh-TW", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        weekday: "long"
      }),
      trainingType: todayDay
        ? trainingTypeLabels[todayDay.trainingType] ?? todayDay.trainingType
        : "無訓練安排",
      description: todayDay?.description ?? "今天沒有目前計畫內的訓練內容。",
      targetDistanceKm: todayDay?.targetDistanceKm ?? null,
      targetDurationMin: todayDay?.targetDurationMin ?? null,
      nutritionNote:
        todayDay?.nutritionSuggestion?.estimateNote ??
        todayDay?.nutritionSuggestion?.carbSuggestion ??
        "尚未有今日營養建議。",
      latestWorkoutStatus: latestWorkoutLog?.completionStatus ?? null
    },
    weekly: {
      range: `${weekStartInput} - ${weekEndInput}`,
      plannedCount: plannedTrainingDays.length,
      completedCount: completedWeekDates.size,
      completionRate:
        plannedTrainingDays.length > 0
          ? Math.round((completedWeekDates.size / plannedTrainingDays.length) * 100)
          : 0,
      distanceKm: Number(weeklyDistanceKm.toFixed(1))
    },
    risk: {
      hasRisk: Boolean(highRiskWorkout || highRiskFeedback),
      message:
        highRiskFeedback?.riskWarning ??
        (highRiskWorkout
          ? `最近紀錄出現疲勞 ${highRiskWorkout.fatigueScore ?? "未提供"}、疼痛 ${
              highRiskWorkout.painScore ?? "未提供"
            }，建議降低強度並觀察恢復。`
          : "目前沒有明顯高風險提醒。")
    },
    feedback: latestFeedback
      ? {
          summary: latestFeedback.summary,
          shouldReplan: latestFeedback.shouldReplan,
          createdAt: formatDateTime(latestFeedback.createdAt)
        }
      : null,
    foodLogs: foodLogs.map((foodLog) => ({
      id: foodLog.id,
      logDate: formatDate(foodLog.logDate),
      mealType: foodLog.mealType ?? "未分類",
      rawInput: foodLog.rawInput,
      estimatedCalories: foodLog.estimatedCalories
    })),
    adjustments: adjustments.map((adjustment) => ({
      id: adjustment.id,
      reasonType: adjustment.reasonType,
      status: adjustment.status,
      createdAt: formatDateTime(adjustment.createdAt),
      newVersionLabel: adjustment.newVersion ? `V${adjustment.newVersion.versionNumber}` : "未產生新版"
    })),
    charts: buildDashboardChartData({
      activeDays,
      foodLogs,
      today,
      workoutLogs
    })
  };
}

function StatCard({
  label,
  value,
  detail
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-panel p-4">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{detail}</p>
    </div>
  );
}

export async function DashboardContent({ showHomeLink = true }: { showHomeLink?: boolean }) {
  const data = await getDashboardData();

  return (
    <PageShell
      eyebrow="訓練總覽"
      title="今日狀態"
      description="整合今日訓練、本週完成狀態、實際紀錄與 AI 風險提醒。此頁只做摘要查閱，紀錄與調整仍回到月曆或調整頁操作。"
      showHomeLink={showHomeLink}
    >
      {!data ? (
        <section className="rounded-lg border border-line bg-panel p-5">
          <h2 className="font-semibold text-foreground">目前沒有使用中的訓練計畫</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            請先建立並套用訓練計畫，這裡才能彙整今日任務與近期狀態。
          </p>
        </section>
      ) : (
        <div className="space-y-6">
          <section className="rounded-lg border border-line bg-panel p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-semibold text-accent">目前計畫</p>
                <h2 className="mt-1 text-xl font-semibold text-foreground">{data.plan.title}</h2>
                <p className="mt-2 text-sm text-muted">{data.plan.goalLabel}</p>
              </div>
              <div className="text-sm text-muted md:text-right">
                <p>{data.plan.activeVersionLabel}</p>
                <p className="mt-1">{data.plan.period}</p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-4">
            <StatCard
              detail={data.weekly.range}
              label="本週完成率"
              value={`${data.weekly.completionRate}%`}
            />
            <StatCard
              detail={`已回報 ${data.weekly.completedCount} / ${data.weekly.plannedCount} 個訓練日`}
              label="訓練回報"
              value={`${data.weekly.completedCount}`}
            />
            <StatCard
              detail="來自本週實際訓練紀錄"
              label="本週跑量"
              value={`${data.weekly.distanceKm} km`}
            />
            <StatCard
              detail={data.risk.hasRisk ? "請優先檢查 AI 回饋" : "維持目前紀錄節奏"}
              label="風險狀態"
              value={data.risk.hasRisk ? "需注意" : "正常"}
            />
          </section>

          <DashboardCharts data={data.charts} />

          <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-lg border border-line bg-panel p-5">
              <p className="text-sm font-semibold text-accent">Today</p>
              <h2 className="mt-1 text-xl font-semibold text-foreground">{data.today.trainingType}</h2>
              <p className="mt-2 text-sm text-muted">{data.today.label}</p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-md border border-line bg-background p-3">
                  <p className="text-xs font-semibold text-muted">距離</p>
                  <p className="mt-2 text-sm text-foreground">
                    {data.today.targetDistanceKm ? `${data.today.targetDistanceKm} km` : "未提供"}
                  </p>
                </div>
                <div className="rounded-md border border-line bg-background p-3">
                  <p className="text-xs font-semibold text-muted">時間</p>
                  <p className="mt-2 text-sm text-foreground">
                    {data.today.targetDurationMin ? `${data.today.targetDurationMin} 分鐘` : "未提供"}
                  </p>
                </div>
                <div className="rounded-md border border-line bg-background p-3">
                  <p className="text-xs font-semibold text-muted">回報狀態</p>
                  <p className="mt-2 text-sm text-foreground">
                    {data.today.latestWorkoutStatus ?? "尚未回報"}
                  </p>
                </div>
              </div>
              <p className="mt-4 rounded-md border border-line bg-background p-3 text-sm leading-6 text-muted">
                {data.today.description}
              </p>
              <p className="mt-3 rounded-md border border-line bg-background p-3 text-sm leading-6 text-muted">
                {data.today.nutritionNote}
              </p>
            </div>

            <div className="rounded-lg border border-line bg-panel p-5">
              <h2 className="font-semibold text-foreground">AI 風險提醒</h2>
              <p className={`mt-3 text-sm leading-6 ${data.risk.hasRisk ? "text-danger" : "text-muted"}`}>
                {data.risk.message}
              </p>
              {data.feedback ? (
                <article className="mt-4 rounded-md border border-line bg-background p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted">{data.feedback.createdAt}</span>
                    {data.feedback.shouldReplan ? (
                      <span className="rounded-md bg-accent/10 px-2 py-1 text-xs font-semibold text-accent">
                        建議調整
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-foreground">{data.feedback.summary}</p>
                </article>
              ) : (
                <p className="mt-4 text-sm leading-6 text-muted">尚未產生 AI 回饋。</p>
              )}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-line bg-panel p-5">
              <h2 className="font-semibold text-foreground">最近飲食紀錄</h2>
              {data.foodLogs.length === 0 ? (
                <p className="mt-2 text-sm leading-6 text-muted">尚未有飲食紀錄。</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {data.foodLogs.slice(0, 5).map((foodLog) => (
                    <article className="rounded-md border border-line bg-background p-3" key={foodLog.id}>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                        <span>{foodLog.logDate}</span>
                        <span>{foodLog.mealType}</span>
                        <span>{foodLog.estimatedCalories ?? "未估算"} kcal</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-foreground">{foodLog.rawInput}</p>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-line bg-panel p-5">
              <h2 className="font-semibold text-foreground">最近計畫調整</h2>
              {data.adjustments.length === 0 ? (
                <p className="mt-2 text-sm leading-6 text-muted">尚未建立調整草稿。</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {data.adjustments.map((adjustment) => (
                    <article className="rounded-md border border-line bg-background p-3" key={adjustment.id}>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                        <span>{adjustment.createdAt}</span>
                        <span>{adjustment.status}</span>
                        <span>{adjustment.newVersionLabel}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-foreground">{adjustment.reasonType}</p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-3">
            <Link className="rounded-lg border border-line bg-panel p-4 text-sm font-semibold text-foreground transition hover:border-primary" href="/calendar">
              前往月曆
            </Link>
            <Link className="rounded-lg border border-line bg-panel p-4 text-sm font-semibold text-foreground transition hover:border-primary" href="/adjustments">
              訓練調整
            </Link>
            <Link className="rounded-lg border border-line bg-panel p-4 text-sm font-semibold text-foreground transition hover:border-primary" href="/history">
              歷史紀錄
            </Link>
          </section>
        </div>
      )}
    </PageShell>
  );
}
