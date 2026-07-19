import { getTaipeiDateInput, isFutureDateInput, toDateInput } from "@/lib/training-date";
import { prisma } from "@/lib/prisma";
import { normalizePlanAdjustmentConversation } from "@/lib/plan-adjustment-conversation";
import { aiPlanAdjustmentConversationSchema } from "@/schemas/ai/replanning";
import type {
  AdjustablePlanItem,
  PlanAdjustmentDayDiff,
  PlanAdjustmentFieldChange
} from "@/types/plan-adjustment";

type ComparableTrainingDay = {
  date: Date;
  trainingType: string;
  targetDistanceKm: number | null;
  targetDurationMin: number | null;
  targetPace: string | null;
  targetIntensity: string | null;
  description: string | null;
  notes: string | null;
  recoverySuggestion: string | null;
  nutritionSuggestion: {
    carbSuggestion: string | null;
    proteinSuggestion: string | null;
    hydrationSuggestion: string | null;
    preWorkoutSuggestion: string | null;
    postWorkoutSuggestion: string | null;
    longRunFuelSuggestion: string | null;
    restDaySuggestion: string | null;
    estimateNote: string | null;
  } | null;
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

const formatDateTime = (value: Date) =>
  value.toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });

const valueOrEmpty = (value: string | number | null | undefined, unit = "") =>
  value === null || value === undefined || String(value).trim() === ""
    ? "未設定"
    : `${value}${unit}`;

const parseAffectedDates = (value: string | null) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
};

const parseConversation = (metadataJson: string | null | undefined) => {
  if (!metadataJson) return null;
  try {
    const parsed = aiPlanAdjustmentConversationSchema.safeParse(JSON.parse(metadataJson));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

const buildDayChanges = (
  before: ComparableTrainingDay,
  after: ComparableTrainingDay
): PlanAdjustmentFieldChange[] => {
  const changes: PlanAdjustmentFieldChange[] = [];
  const pushChange = (field: string, beforeValue: string, afterValue: string) => {
    if (beforeValue !== afterValue) {
      changes.push({ field, before: beforeValue, after: afterValue });
    }
  };

  pushChange(
    "訓練類型",
    trainingTypeLabels[before.trainingType] ?? before.trainingType,
    trainingTypeLabels[after.trainingType] ?? after.trainingType
  );
  pushChange("距離", valueOrEmpty(before.targetDistanceKm, " km"), valueOrEmpty(after.targetDistanceKm, " km"));
  pushChange("時間", valueOrEmpty(before.targetDurationMin, " 分鐘"), valueOrEmpty(after.targetDurationMin, " 分鐘"));
  pushChange("配速", valueOrEmpty(before.targetPace), valueOrEmpty(after.targetPace));
  pushChange("強度", valueOrEmpty(before.targetIntensity), valueOrEmpty(after.targetIntensity));
  pushChange("訓練內容", valueOrEmpty(before.description), valueOrEmpty(after.description));
  pushChange("備註", valueOrEmpty(before.notes), valueOrEmpty(after.notes));
  pushChange("恢復建議", valueOrEmpty(before.recoverySuggestion), valueOrEmpty(after.recoverySuggestion));
  pushChange("碳水建議", valueOrEmpty(before.nutritionSuggestion?.carbSuggestion), valueOrEmpty(after.nutritionSuggestion?.carbSuggestion));
  pushChange("蛋白質建議", valueOrEmpty(before.nutritionSuggestion?.proteinSuggestion), valueOrEmpty(after.nutritionSuggestion?.proteinSuggestion));
  pushChange("補水建議", valueOrEmpty(before.nutritionSuggestion?.hydrationSuggestion), valueOrEmpty(after.nutritionSuggestion?.hydrationSuggestion));
  pushChange("運動前補給", valueOrEmpty(before.nutritionSuggestion?.preWorkoutSuggestion), valueOrEmpty(after.nutritionSuggestion?.preWorkoutSuggestion));
  pushChange("運動後補給", valueOrEmpty(before.nutritionSuggestion?.postWorkoutSuggestion), valueOrEmpty(after.nutritionSuggestion?.postWorkoutSuggestion));
  pushChange("長跑補給", valueOrEmpty(before.nutritionSuggestion?.longRunFuelSuggestion), valueOrEmpty(after.nutritionSuggestion?.longRunFuelSuggestion));
  pushChange("休息日飲食", valueOrEmpty(before.nutritionSuggestion?.restDaySuggestion), valueOrEmpty(after.nutritionSuggestion?.restDaySuggestion));

  return changes;
};

const buildDifferences = (
  originalDays: ComparableTrainingDay[],
  newDays: ComparableTrainingDay[]
): PlanAdjustmentDayDiff[] => {
  const today = getTaipeiDateInput();
  const originalByDate = new Map(
    originalDays.map((day) => [toDateInput(day.date), day])
  );

  return newDays.flatMap((day) => {
    const date = toDateInput(day.date);
    const original = originalByDate.get(date);

    if (!original || !isFutureDateInput(date, today)) return [];
    const changes = buildDayChanges(original, day);
    return changes.length ? [{ date, changes }] : [];
  });
};

export async function getAdjustablePlansData(
  preferredFeedbackId?: string
): Promise<AdjustablePlanItem[]> {
  const profile = await prisma.userProfile.findFirst({
    orderBy: { updatedAt: "desc" },
    select: { id: true }
  });

  if (!profile) return [];

  const plans = await prisma.trainingPlan.findMany({
    where: {
      activeVersionId: { not: null },
      status: { not: "archived" },
      userProfileId: profile.id
    },
    include: {
      trainingGoal: true,
      versions: {
        select: {
          id: true,
          versionNumber: true,
          _count: { select: { trainingDays: true } }
        }
      }
    },
    orderBy: { updatedAt: "desc" }
  });
  const planIds = plans.map((plan) => plan.id);

  if (!planIds.length) return [];

  const [conversations, adjustments, feedback] = await Promise.all([
    prisma.trainingPlanConversation.findMany({
      where: {
        conversationType: "adjustment",
        status: { in: ["active", "completed"] },
        trainingPlanId: { in: planIds },
        userProfileId: profile.id
      },
      include: { messages: { orderBy: { createdAt: "asc" } } },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.planAdjustment.findMany({
      where: {
        status: "draft",
        originalVersion: { trainingPlanId: { in: planIds } }
      },
      include: {
        originalVersion: {
          include: {
            trainingDays: {
              include: { nutritionSuggestion: true },
              orderBy: { date: "asc" }
            }
          }
        },
        newVersion: {
          include: {
            trainingDays: {
              include: { nutritionSuggestion: true },
              orderBy: { date: "asc" }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.aiFeedback.findMany({
      where: {
        feedbackType: "daily_review",
        userProfileId: profile.id,
        OR: [
          {
            workoutLog: {
              trainingDay: {
                trainingPlanVersion: { trainingPlanId: { in: planIds } }
              }
            }
          },
          {
            foodLog: {
              trainingDay: {
                trainingPlanVersion: { trainingPlanId: { in: planIds } }
              }
            }
          }
        ]
      },
      include: {
        workoutLog: {
          select: {
            trainingDay: {
              select: { trainingPlanVersion: { select: { trainingPlanId: true } } }
            }
          }
        },
        foodLog: {
          select: {
            trainingDay: {
              select: { trainingPlanVersion: { select: { trainingPlanId: true } } }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    })
  ]);

  const conversationByPlan = new Map<string, (typeof conversations)[number]>();
  const generatedVersionIds = new Set<string>();
  for (const conversation of conversations) {
    if (conversation.generatedTrainingPlanVersionId) {
      generatedVersionIds.add(conversation.generatedTrainingPlanVersionId);
    }
    if (
      conversation.status === "active" &&
      conversation.trainingPlanId &&
      !conversationByPlan.has(conversation.trainingPlanId)
    ) {
      conversationByPlan.set(conversation.trainingPlanId, conversation);
    }
  }

  const draftByPlan = new Map<string, (typeof adjustments)[number]>();
  for (const adjustment of adjustments) {
    const plan = plans.find((item) => item.id === adjustment.originalVersion.trainingPlanId);
    if (
      plan?.activeVersionId === adjustment.originalVersion.id &&
      adjustment.newVersion &&
      generatedVersionIds.has(adjustment.newVersion.id) &&
      !draftByPlan.has(plan.id)
    ) {
      draftByPlan.set(plan.id, adjustment);
    }
  }

  const feedbackByPlan = new Map<string, typeof feedback>();
  for (const item of feedback) {
    const planId =
      item.workoutLog?.trainingDay?.trainingPlanVersion.trainingPlanId ??
      item.foodLog?.trainingDay?.trainingPlanVersion.trainingPlanId;
    if (!planId) continue;
    const items = feedbackByPlan.get(planId) ?? [];
    items.push(item);
    feedbackByPlan.set(planId, items);
  }

  return plans.map((plan) => {
    const activeVersion = plan.versions.find((version) => version.id === plan.activeVersionId);
    const conversation = conversationByPlan.get(plan.id);
    const assistantMessages =
      conversation?.messages.filter((message) => message.role === "assistant") ?? [];
    const assistantStates = assistantMessages
      .map((message) => parseConversation(message.metadataJson))
      .filter((state): state is NonNullable<typeof state> => Boolean(state));
    const latestConversationState = assistantStates.at(-1) ?? null;
    const normalizedConversationState = latestConversationState
      ? normalizePlanAdjustmentConversation(
          latestConversationState,
          assistantStates.slice(0, -1)
        )
      : null;
    const latestAssistantMessageId = assistantMessages.at(-1)?.id;
    const draft = draftByPlan.get(plan.id);
    const planFeedback = [...(feedbackByPlan.get(plan.id) ?? [])]
      .sort((first, second) => {
        if (first.id === preferredFeedbackId) return -1;
        if (second.id === preferredFeedbackId) return 1;
        return second.createdAt.getTime() - first.createdAt.getTime();
      })
      .slice(0, 3);

    return {
      id: plan.id,
      title: plan.title,
      goalLabel: plan.trainingGoal
        ? `${plan.trainingGoal.targetDistance}${
            plan.trainingGoal.raceName ? ` / ${plan.trainingGoal.raceName}` : ""
          }`
        : "未連結訓練目標",
      startDate: toDateInput(plan.startDate),
      endDate: toDateInput(plan.endDate),
      activeVersionLabel: activeVersion
        ? `V${activeVersion.versionNumber}（${activeVersion._count.trainingDays} 天）`
        : "尚未設定目前版本",
      feedback: planFeedback.map((item) => ({
        id: item.id,
        summary: item.summary,
        riskWarning: item.riskWarning,
        nextStepSuggestion: item.nextStepSuggestion,
        shouldReplan: item.shouldReplan,
        createdAt: formatDateTime(item.createdAt)
      })),
      initialConversation: conversation
        ? {
            id: conversation.id,
            conversation: normalizedConversationState,
            messages: conversation.messages
              .filter((message) => message.role === "user" || message.role === "assistant")
              .map((message) => ({
                role: message.role as "user" | "assistant",
                content:
                  message.id === latestAssistantMessageId && normalizedConversationState
                    ? normalizedConversationState.assistantMessage
                    : message.content
              }))
          }
        : null,
      currentDraft:
        draft?.newVersion
          ? {
              id: draft.id,
              reasonDescription: draft.reasonDescription,
              affectedDates: parseAffectedDates(draft.affectedDates),
              beforeSummary: draft.beforeSummary,
              afterSummary: draft.afterSummary,
              originalVersionNumber: draft.originalVersion.versionNumber,
              newVersionNumber: draft.newVersion.versionNumber,
              differences: buildDifferences(
                draft.originalVersion.trainingDays,
                draft.newVersion.trainingDays
              )
            }
          : null
    };
  });
}
