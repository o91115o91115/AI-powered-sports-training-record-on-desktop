import { PageShell } from "@/components/layout/page-shell";
import { getAdjustablePlansData } from "@/app/adjustments/data";
import { AiPlanChat } from "@/components/training/ai-plan-chat";
import { PlanAdjustmentPanel } from "@/components/training/plan-adjustment-panel";
import {
  PlanVersionList,
  type VersionListItem
} from "@/components/training/plan-version-list";
import { PlannerTabs } from "@/components/training/planner-tabs";
import { prisma } from "@/lib/prisma";
import { aiPlanningConversationSchema } from "@/schemas/ai/planning-conversation";

type PlannerPlan = {
  id: string;
  title: string;
  status: string;
  startDate: string;
  endDate: string;
  activeVersionId: string | null;
  activeVersionLabel: string;
  goalLabel: string;
  versions: VersionListItem[];
};

const toDateInput = (value: Date | null | undefined) =>
  value ? value.toISOString().slice(0, 10) : "";

const formatDate = (value: string) => value || "尚未設定";

const parseConversationMetadata = (metadataJson: string | null) => {
  if (!metadataJson) return null;

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
      trainingGoals: { orderBy: { updatedAt: "desc" }, take: 1 }
    },
    orderBy: { updatedAt: "desc" }
  });
  const latestGoal = profile?.trainingGoals[0];

  const activeConversation =
    profile && latestGoal
      ? await prisma.trainingPlanConversation.findFirst({
          where: {
            conversationType: "planning",
            status: "active",
            trainingGoalId: latestGoal.id,
            userProfileId: profile.id
          },
          include: { messages: { orderBy: { createdAt: "asc" } } },
          orderBy: { updatedAt: "desc" }
        })
      : null;

  const latestAssistantMessage = activeConversation?.messages
    .slice()
    .reverse()
    .find((message) => message.role === "assistant");

  // 首頁只讀取計畫與版本摘要；每日訓練由使用者展開版本後再查詢。
  const plans = profile
    ? await prisma.trainingPlan.findMany({
        where: { userProfileId: profile.id },
        select: {
          id: true,
          title: true,
          status: true,
          startDate: true,
          endDate: true,
          activeVersionId: true,
          trainingGoal: true,
          versions: {
            select: {
              id: true,
              versionNumber: true,
              status: true,
              summary: true,
              _count: { select: { trainingDays: true } }
            },
            orderBy: { versionNumber: "asc" }
          }
        },
        orderBy: { updatedAt: "desc" }
      })
    : [];

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
          ? `V${activeVersion.versionNumber}（${activeVersion._count.trainingDays} 天）`
          : "尚未設定目前版本",
        goalLabel: plan.trainingGoal
          ? `${plan.trainingGoal.targetDistance}${
              plan.trainingGoal.raceName ? ` / ${plan.trainingGoal.raceName}` : ""
            }`
          : "未連結訓練目標",
        versions: plan.versions.map((version) => ({
          id: version.id,
          versionNumber: version.versionNumber,
          status: version.status,
          summary: version.summary,
          trainingDaysCount: version._count.trainingDays
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
  const [{ activeConversation, hasGoal, hasProfile, plans }, adjustablePlans] =
    await Promise.all([getPlannerData(), getAdjustablePlansData()]);
  const adjustablePlansById = new Map(
    adjustablePlans.map((plan) => [plan.id, plan])
  );

  const planContent = (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">現有訓練計畫</h2>
        <p className="mt-1 text-sm text-muted">
          首次僅顯示版本摘要；點擊版本後才會讀取每日訓練內容。
        </p>
      </div>

      {plans.length === 0 ? (
        <div className="rounded-lg border border-line bg-panel p-5 text-sm text-muted">
          目前尚無訓練計畫，請先透過 AI 對話建立計畫。
        </div>
      ) : (
        plans.map((plan) => {
          const adjustablePlan = adjustablePlansById.get(plan.id);

          return (
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
                    期間：{formatDate(plan.startDate)} ～ {formatDate(plan.endDate)}
                  </p>
                </div>
                <p className="text-sm font-semibold text-primary">點擊查看版本</p>
              </div>
            </summary>
            <div className="mt-5 border-t border-line pt-5">
              <PlanVersionList
                activeVersionId={plan.activeVersionId}
                planId={plan.id}
                planStatus={plan.status}
                versions={plan.versions}
              />

              {adjustablePlan ? (
                <details className="mt-5 rounded-lg border border-primary/40 bg-background">
                  <summary className="cursor-pointer list-none p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h4 className="font-semibold text-foreground">
                          使用 AI 調整此計畫
                        </h4>
                        <p className="mt-1 text-sm text-muted">
                          調整對象：{plan.title} / {plan.activeVersionLabel}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-primary">
                        展開調整工具
                      </span>
                    </div>
                  </summary>

                  <div className="border-t border-line p-4">
                    <div className="mb-5 rounded-md border border-line bg-panel p-4 text-sm leading-6 text-muted">
                      請描述近期狀況或希望調整的內容。AI 會先產生新的草稿版本，不會直接覆蓋目前使用中的計畫；確認內容後才會正式套用。
                    </div>
                    <PlanAdjustmentPanel
                      activeVersionLabel={`${plan.title} / ${plan.activeVersionLabel}`}
                      currentDraft={adjustablePlan.currentDraft}
                      feedback={adjustablePlan.feedback}
                      initialConversation={adjustablePlan.initialConversation}
                      planId={plan.id}
                    />
                  </div>
                </details>
              ) : plan.activeVersionId ? (
                <p className="mt-5 rounded-md border border-line bg-background p-4 text-sm text-muted">
                  此計畫目前無法使用 AI 調整，請重新整理頁面或確認目前版本狀態。
                </p>
              ) : (
                <p className="mt-5 rounded-md border border-line bg-background p-4 text-sm text-muted">
                  請先確認一個計畫版本，之後即可使用 AI 調整此計畫。
                </p>
              )}
            </div>
          </details>
          );
        })
      )}
    </section>
  );

  return (
    <PageShell
      description="透過 AI 對話建立訓練計畫，查看不同版本並依近期狀態調整內容。"
      eyebrow="訓練規劃"
      title="訓練計畫"
    >
      <div className="space-y-6">
        {!hasProfile ? (
          <section className="rounded-lg border border-danger bg-panel p-5">
            <h2 className="font-semibold text-danger">尚未建立使用者資料</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              請先完成目標設定，再使用 AI 建立訓練計畫。
            </p>
          </section>
        ) : null}

        <PlannerTabs
          chatContent={
            <AiPlanChat
              disabled={!hasProfile || !hasGoal}
              initialConversation={activeConversation}
            />
          }
          planContent={planContent}
        />
      </div>
    </PageShell>
  );
}
