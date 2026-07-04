import { PageShell } from "@/components/layout/page-shell";
import { TrainingPlanForm } from "@/components/forms/training-plan-form";
import {
  PlanVersionList,
  type VersionListItem
} from "@/components/training/plan-version-list";
import {
  TrainingDayList,
  type TrainingDayListItem
} from "@/components/training/training-day-list";
import { AiPlanGenerator } from "@/components/training/ai-plan-generator";
import { prisma } from "@/lib/prisma";
import {
  emptyTrainingPlanValues,
  type TrainingPlanFormValues
} from "@/schemas/forms/training-plan";

type PlannerPlan = {
  id: string;
  title: string;
  status: string;
  startDate: string;
  endDate: string;
  activeVersionId: string | null;
  goalLabel: string;
  versions: Array<
    VersionListItem & {
      trainingDays: TrainingDayListItem[];
    }
  >;
};

const toDateInput = (value: Date | null | undefined) =>
  value ? value.toISOString().slice(0, 10) : "";

const formatDate = (value: string) => value || "未設定";

async function getPlannerData() {
  const profile = await prisma.userProfile.findFirst({
    include: {
      trainingGoals: {
        orderBy: { updatedAt: "desc" },
        take: 1
      }
    },
    orderBy: { updatedAt: "desc" }
  });

  const latestGoal = profile?.trainingGoals[0];

  const plans = profile
    ? await prisma.trainingPlan.findMany({
        where: { userProfileId: profile.id },
        include: {
          trainingGoal: true,
          versions: {
            include: {
              trainingDays: {
                include: { nutritionSuggestion: true },
                orderBy: { date: "asc" }
              }
            },
            orderBy: { versionNumber: "asc" }
          }
        },
        orderBy: { updatedAt: "desc" }
      })
    : [];

  const planFormValues: TrainingPlanFormValues = profile
    ? {
        ...emptyTrainingPlanValues,
        userProfileId: profile.id,
        trainingGoalId: latestGoal?.id ?? ""
      }
    : emptyTrainingPlanValues;

  return {
    hasProfile: Boolean(profile),
    planFormValues,
    plans: plans.map<PlannerPlan>((plan) => ({
      id: plan.id,
      title: plan.title,
      status: plan.status,
      startDate: toDateInput(plan.startDate),
      endDate: toDateInput(plan.endDate),
      activeVersionId: plan.activeVersionId,
      goalLabel: plan.trainingGoal
        ? `${plan.trainingGoal.targetDistance}${
            plan.trainingGoal.raceName ? ` / ${plan.trainingGoal.raceName}` : ""
          }`
        : "未綁定目標",
      versions: plan.versions.map((version) => ({
        id: version.id,
        versionNumber: version.versionNumber,
        status: version.status,
        summary: version.summary,
        trainingDaysCount: version.trainingDays.length,
        trainingDays: version.trainingDays.map((day) => ({
          id: day.id,
          date: toDateInput(day.date),
          trainingType: day.trainingType,
          targetDistanceKm: day.targetDistanceKm,
          targetDurationMin: day.targetDurationMin,
          targetPace: day.targetPace,
          targetIntensity: day.targetIntensity,
          description: day.description,
          notes: day.notes,
          recoverySuggestion: day.recoverySuggestion,
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
            : null
        }))
      }))
    }))
  };
}

const planStatusLabels: Record<string, string> = {
  draft: "草稿",
  active: "使用中",
  archived: "已封存"
};

export default async function PlannerPage() {
  const { hasProfile, planFormValues, plans } = await getPlannerData();

  return (
    <PageShell
      eyebrow="Training Plan"
      title="訓練計畫"
      description="建立訓練計畫主檔、版本、每日訓練內容與每日營養建議。AI 規劃會在下一階段接上，目前先建立可儲存與可確認的資料流程。"
    >
      <div className="space-y-6">
        {!hasProfile ? (
          <section className="rounded-lg border border-danger bg-panel p-5">
            <h2 className="font-semibold text-danger">尚未建立使用者資料</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              請先到目標設定頁建立使用者基本資料與訓練目標，再建立訓練計畫。
            </p>
          </section>
        ) : null}

        <AiPlanGenerator disabled={!hasProfile} />

        <TrainingPlanForm initialValues={planFormValues} disabled={!hasProfile} />

        <section className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">既有訓練計畫</h2>
            <p className="mt-1 text-sm text-muted">
              草稿可新增版本與每日內容；確認版本後才會更新目前套用版本。
            </p>
          </div>

          {plans.length === 0 ? (
            <div className="rounded-lg border border-line bg-panel p-5 text-sm text-muted">
              尚未建立訓練計畫。
            </div>
          ) : (
            plans.map((plan) => (
              <article className="rounded-lg border border-line bg-panel p-6" key={plan.id}>
                <div className="flex flex-col gap-3 border-b border-line pb-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-foreground">{plan.title}</h3>
                      <span className="rounded-md bg-background px-2 py-1 text-xs font-medium text-muted">
                        {planStatusLabels[plan.status] ?? plan.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted">目標：{plan.goalLabel}</p>
                    <p className="mt-1 text-sm text-muted">
                      期間：{formatDate(plan.startDate)} 至 {formatDate(plan.endDate)}
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <PlanVersionList
                    activeVersionId={plan.activeVersionId}
                    planId={plan.id}
                    planStatus={plan.status}
                    versions={plan.versions.map((version) => ({
                      id: version.id,
                      versionNumber: version.versionNumber,
                      status: version.status,
                      summary: version.summary,
                      trainingDaysCount: version.trainingDaysCount
                    }))}
                  />
                </div>

                <div className="mt-5 space-y-5">
                  {plan.versions.length === 0 ? null : (
                    <h4 className="font-semibold text-foreground">版本每日內容</h4>
                  )}
                  {plan.versions.map((version) => (
                    <section
                      className="rounded-lg border border-line bg-background p-4"
                      key={version.id}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h5 className="font-semibold text-foreground">
                          V{version.versionNumber}
                        </h5>
                        <span className="rounded-md bg-panel px-2 py-1 text-xs font-medium text-muted">
                          {version.summary || "未填寫摘要"}
                        </span>
                      </div>
                      <TrainingDayList
                        canEdit={version.status === "draft" && plan.status !== "archived"}
                        trainingDays={version.trainingDays}
                        trainingPlanVersionId={version.id}
                      />
                    </section>
                  ))}
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </PageShell>
  );
}
