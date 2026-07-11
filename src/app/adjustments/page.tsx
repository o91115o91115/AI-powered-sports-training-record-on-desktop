import { PageShell } from "@/components/layout/page-shell";
import {
  PlanAdjustmentPanel,
  type PlanAdjustmentItem
} from "@/components/training/plan-adjustment-panel";
import { prisma } from "@/lib/prisma";

const toDateInput = (value: Date | null | undefined) =>
  value ? value.toISOString().slice(0, 10) : "";

const formatDateTime = (value: Date) =>
  value.toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });

async function getAdjustmentPageData() {
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
      },
      userProfile: {
        include: {
          aiFeedback: {
            where: { feedbackType: "daily_review" },
            orderBy: { createdAt: "desc" },
            take: 3
          }
        }
      }
    },
    orderBy: { updatedAt: "desc" }
  });

  if (!plan) {
    return null;
  }

  const activeVersion = plan.versions.find((version) => version.id === plan.activeVersionId) ?? null;
  const adjustments = await prisma.planAdjustment.findMany({
    where: {
      originalVersion: {
        trainingPlanId: plan.id
      }
    },
    include: {
      newVersion: {
        include: {
          trainingDays: {
            select: { id: true }
          }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  const goalLabel = plan.trainingGoal
    ? `${plan.trainingGoal.targetDistance}${
        plan.trainingGoal.raceName ? ` / ${plan.trainingGoal.raceName}` : ""
      }`
    : "未提供目標";

  return {
    plan: {
      id: plan.id,
      title: plan.title,
      goalLabel,
      startDate: toDateInput(plan.startDate),
      endDate: toDateInput(plan.endDate),
      activeVersionLabel: activeVersion
        ? `V${activeVersion.versionNumber}（${activeVersion.trainingDays.length} 天）`
        : "尚未套用計畫版本"
    },
    feedback: plan.userProfile.aiFeedback.map((item) => ({
      id: item.id,
      summary: item.summary,
      riskWarning: item.riskWarning,
      shouldReplan: item.shouldReplan,
      createdAt: formatDateTime(item.createdAt)
    })),
    adjustments: adjustments.map<PlanAdjustmentItem>((adjustment) => ({
      id: adjustment.id,
      reasonType: adjustment.reasonType,
      reasonDescription: adjustment.reasonDescription,
      affectedDates: adjustment.affectedDates,
      beforeSummary: adjustment.beforeSummary,
      afterSummary: adjustment.afterSummary,
      status: adjustment.status,
      createdAt: formatDateTime(adjustment.createdAt),
      newVersion: adjustment.newVersion
        ? {
            id: adjustment.newVersion.id,
            versionNumber: adjustment.newVersion.versionNumber,
            trainingDaysCount: adjustment.newVersion.trainingDays.length
          }
        : null
    }))
  };
}

export default async function AdjustmentsPage() {
  const data = await getAdjustmentPageData();

  return (
    <PageShell
      eyebrow="計畫調整"
      title="訓練計畫調整"
      description="根據近期訓練、飲食與 AI 今日回饋產生調整草稿。草稿需手動確認後才會啟用新版計畫。"
    >
      {!data ? (
        <section className="rounded-lg border border-line bg-panel p-5">
          <h2 className="font-semibold text-foreground">目前沒有使用中的訓練計畫</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            請先在訓練計畫頁建立並啟用版本，再產生計畫調整草稿。
          </p>
        </section>
      ) : (
        <div className="space-y-6">
          <section className="rounded-lg border border-line bg-panel p-5">
            <p className="text-sm font-semibold text-accent">目前計畫</p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">{data.plan.title}</h2>
            <div className="mt-4 grid gap-3 text-sm text-muted md:grid-cols-3">
              <div className="rounded-md border border-line bg-background p-3">
                <p className="text-xs font-semibold">目標</p>
                <p className="mt-1">{data.plan.goalLabel}</p>
              </div>
              <div className="rounded-md border border-line bg-background p-3">
                <p className="text-xs font-semibold">期間</p>
                <p className="mt-1">
                  {data.plan.startDate || "未提供"} - {data.plan.endDate || "未提供"}
                </p>
              </div>
              <div className="rounded-md border border-line bg-background p-3">
                <p className="text-xs font-semibold">目前版本</p>
                <p className="mt-1">{data.plan.activeVersionLabel}</p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-line bg-panel p-5">
            <h2 className="font-semibold text-foreground">最近 AI 今日回饋</h2>
            {data.feedback.length === 0 ? (
              <p className="mt-2 text-sm leading-6 text-muted">
                尚未產生 AI 今日回饋。若要讓調整更準確，建議先在月曆中產生每日回饋。
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {data.feedback.map((feedback) => (
                  <article className="rounded-md border border-line bg-background p-3" key={feedback.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted">{feedback.createdAt}</span>
                      {feedback.shouldReplan ? (
                        <span className="rounded-md bg-accent/10 px-2 py-1 text-xs font-semibold text-accent">
                          建議調整
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-foreground">{feedback.summary}</p>
                    {feedback.riskWarning ? (
                      <p className="mt-2 text-sm leading-6 text-danger">{feedback.riskWarning}</p>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>

          <PlanAdjustmentPanel
            activeVersionLabel={data.plan.activeVersionLabel}
            adjustments={data.adjustments}
            planId={data.plan.id}
          />
        </div>
      )}
    </PageShell>
  );
}
