import Link from "next/link";

import { PageShell } from "@/components/layout/page-shell";
import { getSportCategoryLabel } from "@/lib/sport-category";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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

async function getHistoryData() {
  const plan = await prisma.trainingPlan.findFirst({
    where: { status: "active" },
    include: {
      trainingGoal: true,
      versions: {
        include: {
          trainingDays: {
            select: { id: true }
          }
        },
        orderBy: { versionNumber: "desc" }
      }
    },
    orderBy: { updatedAt: "desc" }
  });

  if (!plan) {
    return null;
  }

  const [workoutLogs, foodLogs, feedback, adjustments] = await Promise.all([
    prisma.workoutLog.findMany({
      where: { userProfileId: plan.userProfileId },
      include: {
        trainingDay: {
          include: {
            trainingPlanVersion: {
              select: {
                versionNumber: true
              }
            }
          }
        }
      },
      orderBy: { logDate: "desc" },
      take: 30
    }),
    prisma.foodLog.findMany({
      where: { userProfileId: plan.userProfileId },
      include: {
        trainingDay: {
          include: {
            trainingPlanVersion: {
              select: {
                versionNumber: true
              }
            }
          }
        }
      },
      orderBy: { logDate: "desc" },
      take: 30
    }),
    prisma.aiFeedback.findMany({
      where: { userProfileId: plan.userProfileId },
      include: {
        workoutLog: {
          select: {
            logDate: true
          }
        },
        foodLog: {
          select: {
            logDate: true
          }
        },
        planAdjustment: {
          select: {
            reasonType: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 20
    }),
    prisma.planAdjustment.findMany({
      where: {
        originalVersion: {
          trainingPlanId: plan.id
        }
      },
      include: {
        originalVersion: {
          select: {
            versionNumber: true
          }
        },
        newVersion: {
          select: {
            versionNumber: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 20
    })
  ]);

  const activeVersion =
    plan.versions.find((version) => version.id === plan.activeVersionId) ??
    null;

  return {
    plan: {
      title: plan.title,
      goalLabel: plan.trainingGoal
        ? `${plan.trainingGoal.targetDistance}${
            plan.trainingGoal.raceName ? ` / ${plan.trainingGoal.raceName}` : ""
          }`
        : "未連結目標",
      activeVersionLabel: activeVersion
        ? `V${activeVersion.versionNumber}（${activeVersion.trainingDays.length} 天）`
        : "尚未套用計畫版本"
    },
    workoutLogs: workoutLogs.map((workoutLog) => ({
      id: workoutLog.id,
      logDate: formatDate(workoutLog.logDate),
      rawInput: workoutLog.rawInput,
      sportCategory: getSportCategoryLabel(workoutLog.sportCategory),
      workoutType: workoutLog.workoutType ?? "未分類",
      distanceKm: workoutLog.distanceKm,
      durationMin: workoutLog.durationMin,
      fatigueScore: workoutLog.fatigueScore,
      painScore: workoutLog.painScore,
      completionStatus: workoutLog.completionStatus ?? "未提供",
      versionLabel: workoutLog.trainingDay?.trainingPlanVersion
        ? `V${workoutLog.trainingDay.trainingPlanVersion.versionNumber}`
        : "未綁定版本"
    })),
    foodLogs: foodLogs.map((foodLog) => ({
      id: foodLog.id,
      logDate: formatDate(foodLog.logDate),
      rawInput: foodLog.rawInput,
      mealType: foodLog.mealType
        ? (mealTypeLabels[foodLog.mealType] ?? foodLog.mealType)
        : "未分類",
      estimatedCarbsG: foodLog.estimatedCarbsG,
      estimatedProteinG: foodLog.estimatedProteinG,
      estimatedCalories: foodLog.estimatedCalories,
      versionLabel: foodLog.trainingDay?.trainingPlanVersion
        ? `V${foodLog.trainingDay.trainingPlanVersion.versionNumber}`
        : "未綁定版本"
    })),
    feedback: feedback.map((item) => ({
      id: item.id,
      feedbackType: item.feedbackType,
      summary: item.summary,
      riskWarning: item.riskWarning,
      shouldReplan: item.shouldReplan,
      createdAt: formatDateTime(item.createdAt),
      sourceLabel: item.workoutLog
        ? `訓練 ${formatDate(item.workoutLog.logDate)}`
        : item.foodLog
          ? `飲食 ${formatDate(item.foodLog.logDate)}`
          : item.planAdjustment
            ? `調整 ${item.planAdjustment.reasonType}`
            : "一般回饋"
    })),
    adjustments: adjustments.map((adjustment) => ({
      id: adjustment.id,
      reasonType: adjustment.reasonType,
      reasonDescription: adjustment.reasonDescription,
      affectedDates: adjustment.affectedDates,
      beforeSummary: adjustment.beforeSummary,
      afterSummary: adjustment.afterSummary,
      status: adjustment.status,
      createdAt: formatDateTime(adjustment.createdAt),
      versionFlow: `V${adjustment.originalVersion.versionNumber} -> ${
        adjustment.newVersion
          ? `V${adjustment.newVersion.versionNumber}`
          : "未產生新版"
      }`
    }))
  };
}

function EmptyState({ message }: { message: string }) {
  return <p className="mt-2 text-sm leading-6 text-muted">{message}</p>;
}

export default async function HistoryPage() {
  const data = await getHistoryData();

  return (
    <PageShell
      eyebrow="紀錄查詢"
      title="歷史紀錄"
      description="集中查詢過去訓練、飲食、AI 回饋與計畫調整紀錄。此頁保留查閱用途，資料新增與修改仍回到月曆或調整頁。"
    >
      {!data ? (
        <section className="rounded-lg border border-line bg-panel p-5">
          <h2 className="font-semibold text-foreground">
            目前沒有使用中的訓練計畫
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            請先建立並啟用訓練計畫，歷史頁才會依使用者資料彙整紀錄。
          </p>
        </section>
      ) : (
        <div className="space-y-6">
          <section className="rounded-lg border border-line bg-panel p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-semibold text-accent">目前計畫</p>
                <h2 className="mt-1 text-xl font-semibold text-foreground">
                  {data.plan.title}
                </h2>
                <p className="mt-2 text-sm text-muted">{data.plan.goalLabel}</p>
              </div>
              <p className="text-sm text-muted">
                {data.plan.activeVersionLabel}
              </p>
            </div>
          </section>

          <section className="rounded-lg border border-line bg-panel p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-semibold text-foreground">實際訓練紀錄</h2>
                <p className="mt-1 text-sm text-muted">
                  最近 30 筆，依回報日期排序。
                </p>
              </div>
              <Link
                className="text-sm font-semibold text-primary"
                href="/calendar"
              >
                回月曆新增紀錄
              </Link>
            </div>
            {data.workoutLogs.length === 0 ? (
              <EmptyState message="尚未有實際訓練紀錄。" />
            ) : (
              <div className="mt-4 space-y-3">
                {data.workoutLogs.map((workoutLog) => (
                  <article
                    className="rounded-md border border-line bg-background p-3"
                    key={workoutLog.id}
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span>{workoutLog.logDate}</span>
                      <span>{workoutLog.versionLabel}</span>
                      <span>{workoutLog.completionStatus}</span>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-muted md:grid-cols-4">
                      <p>分類：{workoutLog.sportCategory}</p>
                      <p>類型：{workoutLog.workoutType}</p>
                      <p>距離：{workoutLog.distanceKm ?? "未提供"} km</p>
                      <p>時間：{workoutLog.durationMin ?? "未提供"} 分鐘</p>
                      <p>
                        疲勞 / 疼痛：{workoutLog.fatigueScore ?? "未提供"} /{" "}
                        {workoutLog.painScore ?? "未提供"}
                      </p>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-foreground">
                      {workoutLog.rawInput}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-line bg-panel p-5">
            <h2 className="font-semibold text-foreground">實際飲食紀錄</h2>
            <p className="mt-1 text-sm text-muted">
              最近 30 筆，營養數值為估算。
            </p>
            {data.foodLogs.length === 0 ? (
              <EmptyState message="尚未有實際飲食紀錄。" />
            ) : (
              <div className="mt-4 space-y-3">
                {data.foodLogs.map((foodLog) => (
                  <article
                    className="rounded-md border border-line bg-background p-3"
                    key={foodLog.id}
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span>{foodLog.logDate}</span>
                      <span>{foodLog.mealType}</span>
                      <span>{foodLog.versionLabel}</span>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-muted md:grid-cols-3">
                      <p>碳水：{foodLog.estimatedCarbsG ?? "未估算"} g</p>
                      <p>蛋白質：{foodLog.estimatedProteinG ?? "未估算"} g</p>
                      <p>熱量：{foodLog.estimatedCalories ?? "未估算"} kcal</p>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-foreground">
                      {foodLog.rawInput}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-line bg-panel p-5">
            <h2 className="font-semibold text-foreground">AI 回饋紀錄</h2>
            <p className="mt-1 text-sm text-muted">
              最近 20 筆，包含每日回饋與調整相關回饋。
            </p>
            {data.feedback.length === 0 ? (
              <EmptyState message="尚未有 AI 回饋紀錄。" />
            ) : (
              <div className="mt-4 space-y-3">
                {data.feedback.map((feedback) => (
                  <article
                    className="rounded-md border border-line bg-background p-3"
                    key={feedback.id}
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span>{feedback.createdAt}</span>
                      <span>{feedback.feedbackType}</span>
                      <span>{feedback.sourceLabel}</span>
                      {feedback.shouldReplan ? (
                        <span className="rounded-md bg-accent/10 px-2 py-1 font-semibold text-accent">
                          建議調整
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-foreground">
                      {feedback.summary}
                    </p>
                    {feedback.riskWarning ? (
                      <p className="mt-2 text-sm leading-6 text-danger">
                        {feedback.riskWarning}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-line bg-panel p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-semibold text-foreground">計畫調整紀錄</h2>
                <p className="mt-1 text-sm text-muted">
                  最近 20 筆，保留版本流向與調整摘要。
                </p>
              </div>
              <Link
                className="text-sm font-semibold text-primary"
                href="/adjustments"
              >
                前往調整頁
              </Link>
            </div>
            {data.adjustments.length === 0 ? (
              <EmptyState message="尚未有計畫調整紀錄。" />
            ) : (
              <div className="mt-4 space-y-3">
                {data.adjustments.map((adjustment) => (
                  <article
                    className="rounded-md border border-line bg-background p-3"
                    key={adjustment.id}
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span>{adjustment.createdAt}</span>
                      <span>{adjustment.status}</span>
                      <span>{adjustment.versionFlow}</span>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-foreground">
                      {adjustment.reasonType}
                    </p>
                    {adjustment.reasonDescription ? (
                      <p className="mt-2 text-sm leading-6 text-muted">
                        {adjustment.reasonDescription}
                      </p>
                    ) : null}
                    {adjustment.affectedDates ? (
                      <p className="mt-2 text-xs text-muted">
                        影響日期：{adjustment.affectedDates}
                      </p>
                    ) : null}
                    {adjustment.afterSummary ? (
                      <p className="mt-2 text-sm leading-6 text-foreground">
                        {adjustment.afterSummary}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </PageShell>
  );
}
