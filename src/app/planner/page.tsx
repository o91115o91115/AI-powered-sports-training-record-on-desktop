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
import { AiPlanChat } from "@/components/training/ai-plan-chat";
import {
  PlanAdjustmentPanel,
  type PlanAdjustmentItem
} from "@/components/training/plan-adjustment-panel";
import { prisma } from "@/lib/prisma";
import { aiPlanningConversationSchema } from "@/schemas/ai/planning-conversation";
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
  activeVersionLabel: string;
  adjustments: PlanAdjustmentItem[];
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

const parseConversationMetadata = (metadataJson: string | null) => {
  if (!metadataJson) {
    return null;
  }

  try {
    const parsed = aiPlanningConversationSchema.safeParse(JSON.parse(metadataJson));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

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

  const activeConversation =
    profile && latestGoal
      ? await prisma.trainingPlanConversation.findFirst({
          where: {
            status: "active",
            trainingGoalId: latestGoal.id,
            userProfileId: profile.id
          },
          include: {
            messages: {
              orderBy: { createdAt: "asc" }
            }
          },
          orderBy: { updatedAt: "desc" }
        })
      : null;

  const latestAssistantMessage = activeConversation?.messages
    .slice()
    .reverse()
    .find((message) => message.role === "assistant");

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
  const adjustments = profile
    ? await prisma.planAdjustment.findMany({
        where: {
          originalVersion: {
            trainingPlan: {
              userProfileId: profile.id
            }
          }
        },
        include: {
          originalVersion: {
            select: { trainingPlanId: true }
          },
          newVersion: {
            include: {
              trainingDays: {
                select: { id: true }
              }
            }
          }
        },
        orderBy: { createdAt: "desc" }
      })
    : [];
  const adjustmentsByPlanId = new Map<string, PlanAdjustmentItem[]>();

  for (const adjustment of adjustments) {
    const planAdjustments = adjustmentsByPlanId.get(adjustment.originalVersion.trainingPlanId) ?? [];
    planAdjustments.push({
      id: adjustment.id,
      reasonType: adjustment.reasonType,
      reasonDescription: adjustment.reasonDescription,
      affectedDates: adjustment.affectedDates,
      beforeSummary: adjustment.beforeSummary,
      afterSummary: adjustment.afterSummary,
      status: adjustment.status,
      createdAt: adjustment.createdAt.toLocaleString("zh-TW", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      }),
      newVersion: adjustment.newVersion
        ? {
            id: adjustment.newVersion.id,
            versionNumber: adjustment.newVersion.versionNumber,
            trainingDaysCount: adjustment.newVersion.trainingDays.length
          }
        : null
    });
    adjustmentsByPlanId.set(adjustment.originalVersion.trainingPlanId, planAdjustments);
  }

  const planFormValues: TrainingPlanFormValues = profile
    ? {
        ...emptyTrainingPlanValues,
        userProfileId: profile.id,
        trainingGoalId: latestGoal?.id ?? ""
      }
    : emptyTrainingPlanValues;

  return {
    activeConversation: activeConversation
      ? {
          id: activeConversation.id,
          conversation: parseConversationMetadata(latestAssistantMessage?.metadataJson ?? null),
          messages: activeConversation.messages
            .filter((message) => message.role === "user" || message.role === "assistant")
            .map((message) => ({
              role: message.role as "user" | "assistant",
              content: message.content
            }))
        }
      : null,
    hasGoal: Boolean(latestGoal),
    hasProfile: Boolean(profile),
    planFormValues,
    plans: plans.map<PlannerPlan>((plan) => {
      const activeVersion = plan.versions.find(
        (version) => version.id === plan.activeVersionId
      );

      return {
        id: plan.id,
        title: plan.title,
        status: plan.status,
        startDate: toDateInput(plan.startDate),
        endDate: toDateInput(plan.endDate),
        activeVersionId: plan.activeVersionId,
        activeVersionLabel: activeVersion
          ? `V${activeVersion.versionNumber}（${activeVersion.trainingDays.length} 天）`
          : "尚未套用計畫版本",
        adjustments: adjustmentsByPlanId.get(plan.id) ?? [],
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
      };
    })
  };
}

const planStatusLabels: Record<string, string> = {
  draft: "草稿",
  active: "使用中",
  archived: "已封存"
};

export default async function PlannerPage() {
  const { activeConversation, hasGoal, hasProfile, planFormValues, plans } =
    await getPlannerData();

  return (
    <PageShell
      eyebrow="訓練安排"
      title="訓練計畫"
      description="建立、套用與調整訓練計畫。建議先查看目前使用中的計畫，再依需要展開其他版本。"
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

        <AiPlanChat
          disabled={!hasProfile || !hasGoal}
          initialConversation={activeConversation}
        />

        <TrainingPlanForm initialValues={planFormValues} disabled={!hasProfile} />

        <section className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">既有訓練計畫</h2>
            <p className="mt-1 text-sm text-muted">
              草稿可新增版本與每日內容；確認套用後才會成為目前使用中的計畫。
            </p>
          </div>

          {plans.length === 0 ? (
            <div className="rounded-lg border border-line bg-panel p-5 text-sm text-muted">
              尚未建立訓練計畫。
            </div>
          ) : (
            plans.map((plan) => (
              <details
                className="rounded-lg border border-line bg-panel p-6"
                key={plan.id}
                open={plan.status === "active"}
              >
                <summary className="cursor-pointer list-none">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
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
                    <p className="text-sm font-semibold text-primary">展開查看</p>
                  </div>
                </summary>

                <div className="mt-5 border-t border-line pt-5">
                  <div>
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
                    <h4 className="font-semibold text-foreground">每日內容</h4>
                  )}
                  {plan.versions.map((version) => (
                    <details
                      className="rounded-lg border border-line bg-background p-4"
                      key={version.id}
                      open={version.id === plan.activeVersionId}
                    >
                      <summary className="cursor-pointer list-none">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <h5 className="font-semibold text-foreground">
                              V{version.versionNumber}
                            </h5>
                            <span className="rounded-md bg-panel px-2 py-1 text-xs font-medium text-muted">
                              {version.summary || "未填寫摘要"}
                            </span>
                            {version.id === plan.activeVersionId ? (
                              <span className="rounded-md bg-primary px-2 py-1 text-xs font-semibold text-white">
                                目前使用
                              </span>
                            ) : null}
                          </div>
                          <span className="text-sm font-semibold text-primary">
                            {version.trainingDaysCount} 天
                          </span>
                        </div>
                      </summary>
                      <div className="mt-4 border-t border-line pt-4">
                        <TrainingDayList
                          canEdit={version.status === "draft" && plan.status !== "archived"}
                          trainingDays={version.trainingDays}
                          trainingPlanVersionId={version.id}
                        />
                      </div>
                    </details>
                  ))}
                </div>
                {plan.activeVersionId ? (
                  <div className="mt-5">
                    <PlanAdjustmentPanel
                      activeVersionLabel={plan.activeVersionLabel}
                      adjustments={plan.adjustments}
                      planId={plan.id}
                    />
                  </div>
                ) : null}
                </div>
              </details>
            ))
          )}
        </section>
      </div>
    </PageShell>
  );
}
