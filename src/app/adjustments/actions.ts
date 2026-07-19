"use server";

import {
  getTaipeiDateInput,
  isFutureDateInput,
  parseDateInput,
  toDateInput
} from "@/lib/training-date";
import {
  getMeaningfulAdjustmentText,
  normalizePlanAdjustmentConversation
} from "@/lib/plan-adjustment-conversation";
import { prisma } from "@/lib/prisma";
import { revalidateTrainingViews } from "@/lib/revalidate-training-views";
import { inferSportCategory } from "@/lib/sport-category";
import {
  aiPlanAdjustmentConversationSchema,
  generatePlanAdjustmentRequestSchema,
  planAdjustmentChatRequestSchema,
  type AiPlanAdjustmentConversation
} from "@/schemas/ai/replanning";
import type { PlanningConversationMessage } from "@/schemas/ai/planning-conversation";
import type { AiTrainingDay } from "@/schemas/ai/training-plan";
import {
  continuePlanAdjustmentConversation,
  createPlanAdjustmentDraft
} from "@/services/ai/replanning-agent";

export type AdjustmentActionResult = {
  ok: boolean;
  message: string;
};

export type PlanAdjustmentChatMessage = PlanningConversationMessage;

export type PlanAdjustmentChatActionResult = AdjustmentActionResult & {
  conversationId?: string;
  conversation?: AiPlanAdjustmentConversation;
  messages?: PlanAdjustmentChatMessage[];
};

type ActiveTrainingDay = {
  date: Date;
  sportCategory: string | null;
  trainingType: string;
  targetDistanceKm: number | null;
  targetDurationMin: number | null;
  targetPace: string | null;
  targetIntensity: string | null;
  description: string | null;
  notes: string | null;
  recoverySuggestion: string | null;
  completionStatus: string;
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

type PlanAdjustmentContext = Awaited<
  ReturnType<typeof getPlanAdjustmentContext>
>;

const serializeMessages = (
  messages: Array<{ role: string; content: string }>
): PlanAdjustmentChatMessage[] =>
  messages
    .filter(
      (message): message is PlanAdjustmentChatMessage =>
        (message.role === "user" || message.role === "assistant") &&
        message.content.trim().length > 0
    )
    .slice(-20)
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 2000)
    }));

const parseConversationMetadata = (metadataJson: string | null | undefined) => {
  if (!metadataJson) return null;

  try {
    const parsed = aiPlanAdjustmentConversationSchema.safeParse(
      JSON.parse(metadataJson)
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

const getRiskLevel = (conversation: AiPlanAdjustmentConversation) => {
  if (conversation.readiness === "high_risk") return "high_risk";
  return conversation.riskWarnings.length ? "caution" : "normal";
};

const getPlanAdjustmentContext = async (
  trainingPlanId: string,
  feedbackId?: string | null
) => {
  const plan = await prisma.trainingPlan.findUnique({
    where: { id: trainingPlanId },
    include: {
      trainingGoal: true,
      versions: {
        include: {
          trainingDays: {
            include: { nutritionSuggestion: true },
            orderBy: { date: "asc" }
          }
        },
        orderBy: { versionNumber: "desc" }
      },
      userProfile: {
        include: {
          workoutLogs: { orderBy: { logDate: "desc" }, take: 14 },
          foodLogs: { orderBy: { logDate: "desc" }, take: 14 }
        }
      }
    }
  });

  if (!plan || plan.status === "archived" || !plan.activeVersionId) {
    throw new Error("missing_active_plan");
  }

  const activeVersion = plan.versions.find(
    (version) => version.id === plan.activeVersionId
  );

  if (!activeVersion) {
    throw new Error("missing_active_version");
  }

  const feedbackWhere = {
    feedbackType: "daily_review",
    userProfileId: plan.userProfileId,
    OR: [
      {
        workoutLog: {
          trainingDay: { trainingPlanVersion: { trainingPlanId: plan.id } }
        }
      },
      {
        foodLog: {
          trainingDay: { trainingPlanVersion: { trainingPlanId: plan.id } }
        }
      }
    ]
  };
  const recentFeedback = await prisma.aiFeedback.findMany({
    where: feedbackWhere,
    orderBy: { createdAt: "desc" },
    take: 5
  });
  const sourceFeedback = feedbackId
    ? await prisma.aiFeedback.findFirst({
        where: { ...feedbackWhere, id: feedbackId }
      })
    : null;
  const feedback = sourceFeedback
    ? [
        sourceFeedback,
        ...recentFeedback.filter((item) => item.id !== sourceFeedback.id)
      ]
    : recentFeedback;

  return { activeVersion, feedback, plan };
};

const toAiTrainingDay = (day: ActiveTrainingDay): AiTrainingDay => ({
  date: toDateInput(day.date),
  trainingType: day.trainingType as AiTrainingDay["trainingType"],
  targetDistanceKm: day.targetDistanceKm,
  targetDurationMin: day.targetDurationMin,
  targetPace: day.targetPace,
  targetIntensity: day.targetIntensity,
  description: day.description ?? "",
  notes: day.notes ?? "",
  recoverySuggestion: day.recoverySuggestion ?? "",
  nutritionSuggestion: {
    carbSuggestion: day.nutritionSuggestion?.carbSuggestion ?? "",
    proteinSuggestion: day.nutritionSuggestion?.proteinSuggestion ?? "",
    hydrationSuggestion: day.nutritionSuggestion?.hydrationSuggestion ?? "",
    preWorkoutSuggestion: day.nutritionSuggestion?.preWorkoutSuggestion ?? "",
    postWorkoutSuggestion: day.nutritionSuggestion?.postWorkoutSuggestion ?? "",
    longRunFuelSuggestion: day.nutritionSuggestion?.longRunFuelSuggestion ?? "",
    restDaySuggestion: day.nutritionSuggestion?.restDaySuggestion ?? "",
    estimateNote: day.nutritionSuggestion?.estimateNote ?? ""
  }
});

const toAgentContext = (context: PlanAdjustmentContext) => {
  const { activeVersion, feedback, plan } = context;
  const today = getTaipeiDateInput();

  return {
    plan: {
      title: plan.title,
      goalLabel: plan.trainingGoal
        ? `${plan.trainingGoal.targetDistance}${
            plan.trainingGoal.raceName ? ` / ${plan.trainingGoal.raceName}` : ""
          }`
        : "未提供目標",
      startDate: toDateInput(plan.startDate),
      endDate: toDateInput(plan.endDate),
      activeVersionSummary: activeVersion.summary
    },
    activeTrainingDays: activeVersion.trainingDays
      .filter((day) => isFutureDateInput(toDateInput(day.date), today))
      .map((day) => ({
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
      })),
    recentWorkoutLogs: plan.userProfile.workoutLogs.map((log) => ({
      logDate: toDateInput(log.logDate),
      rawInput: log.rawInput,
      distanceKm: log.distanceKm,
      durationMin: log.durationMin,
      fatigueScore: log.fatigueScore,
      painLocation: log.painLocation,
      painScore: log.painScore,
      completionStatus: log.completionStatus
    })),
    recentFoodLogs: plan.userProfile.foodLogs.map((log) => ({
      logDate: toDateInput(log.logDate),
      rawInput: log.rawInput,
      estimatedCarbsG: log.estimatedCarbsG,
      estimatedProteinG: log.estimatedProteinG,
      estimatedCalories: log.estimatedCalories
    })),
    recentFeedback: feedback.map((item) => ({
      summary: item.summary,
      trainingAnalysis: item.trainingAnalysis,
      nutritionAnalysis: item.nutritionAnalysis,
      riskWarning: item.riskWarning,
      nextStepSuggestion: item.nextStepSuggestion,
      shouldReplan: item.shouldReplan
    }))
  };
};

const buildConversationSummary = (
  messages: PlanAdjustmentChatMessage[],
  conversation: AiPlanAdjustmentConversation
) => `對話狀態：${conversation.readiness}
調整方向：${getMeaningfulAdjustmentText(conversation.adjustmentSummary) ?? "尚未整理"}
仍需補充：${conversation.missingInformation.join("、") || "無"}
風險提醒：${conversation.riskWarnings.join("、") || "無"}

最近對話：
${messages
  .map(
    (message) =>
      `${message.role === "user" ? "使用者" : "AI"}：${message.content}`
  )
  .join("\n")}`;

const getOrCreateAdjustmentConversation = async (
  context: PlanAdjustmentContext,
  conversationId: string | null
) => {
  const { plan } = context;

  if (conversationId) {
    const existing = await prisma.trainingPlanConversation.findFirst({
      where: {
        conversationType: "adjustment",
        id: conversationId,
        status: "active",
        trainingPlanId: plan.id,
        userProfileId: plan.userProfileId
      }
    });

    if (existing) return existing;
  }

  const active = await prisma.trainingPlanConversation.findFirst({
    where: {
      conversationType: "adjustment",
      status: "active",
      trainingPlanId: plan.id,
      userProfileId: plan.userProfileId
    },
    orderBy: { updatedAt: "desc" }
  });

  if (active) return active;

  return prisma.trainingPlanConversation.create({
    data: {
      conversationType: "adjustment",
      readiness: "needs_more_info",
      riskLevel: "normal",
      status: "active",
      trainingGoalId: plan.trainingGoalId,
      trainingPlanId: plan.id,
      userProfileId: plan.userProfileId
    }
  });
};

export async function sendPlanAdjustmentChatMessage(
  values: unknown
): Promise<PlanAdjustmentChatActionResult> {
  const parsed = planAdjustmentChatRequestSchema.safeParse(values);

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "調整對話資料不完整。"
    };
  }

  try {
    const context = await getPlanAdjustmentContext(
      parsed.data.trainingPlanId,
      parsed.data.feedbackId
    );
    const agentContext = toAgentContext(context);

    if (!agentContext.activeTrainingDays.length) {
      return { ok: false, message: "此計畫已沒有明天起可調整的訓練內容。" };
    }

    const conversation = await getOrCreateAdjustmentConversation(
      context,
      parsed.data.conversationId
    );
    await prisma.trainingPlanConversationMessage.create({
      data: {
        content: parsed.data.userMessage,
        conversationId: conversation.id,
        role: "user"
      }
    });
    const persistedMessages =
      await prisma.trainingPlanConversationMessage.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: "asc" }
      });
    const messages = serializeMessages(persistedMessages);
    const previousConversationStates = persistedMessages
      .filter((message) => message.role === "assistant")
      .map((message) => parseConversationMetadata(message.metadataJson))
      .filter((state): state is AiPlanAdjustmentConversation => Boolean(state));
    const aiResult = await continuePlanAdjustmentConversation({
      ...agentContext,
      adjustableAfter: getTaipeiDateInput(),
      messages,
      previousConversationStates
    });
    const normalizedResult = normalizePlanAdjustmentConversation(
      aiResult.result,
      previousConversationStates
    );
    const nextMessages: PlanAdjustmentChatMessage[] = [
      ...messages,
      { role: "assistant", content: normalizedResult.assistantMessage }
    ];

    await prisma.$transaction(async (tx) => {
      await tx.trainingPlanConversationMessage.create({
        data: {
          content: normalizedResult.assistantMessage,
          conversationId: conversation.id,
          metadataJson: JSON.stringify(normalizedResult),
          role: "assistant"
        }
      });
      await tx.trainingPlanConversation.update({
        where: { id: conversation.id },
        data: {
          readiness: normalizedResult.readiness,
          riskLevel: getRiskLevel(normalizedResult),
          summary: buildConversationSummary(nextMessages, normalizedResult)
        }
      });
    });

    revalidateTrainingViews();
    return {
      ok: true,
      message: normalizedResult.assistantMessage,
      conversationId: conversation.id,
      conversation: normalizedResult,
      messages: nextMessages
    };
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("OPENAI_API_KEY")
        ? "目前尚未完成 AI 服務設定，無法開始計畫調整對話。"
        : error instanceof Error && error.message.startsWith("missing_active")
          ? "找不到可調整的使用中計畫版本，請重新選擇計畫。"
          : "AI 計畫調整對話失敗，請稍後再試。";
    return { ok: false, message };
  }
}

export async function restartPlanAdjustmentConversation(
  conversationId: string | null,
  trainingPlanId: string
): Promise<AdjustmentActionResult> {
  try {
    if (conversationId) {
      await prisma.trainingPlanConversation.updateMany({
        where: {
          conversationType: "adjustment",
          id: conversationId,
          status: "active",
          trainingPlanId
        },
        data: { status: "discarded" }
      });
    }
    revalidateTrainingViews();
    return { ok: true, message: "已放棄本次對話，可以重新描述調整方向。" };
  } catch {
    return { ok: false, message: "重新開始調整對話失敗，請稍後再試。" };
  }
}

const mergeAdjustedTrainingDays = (
  activeTrainingDays: ActiveTrainingDay[],
  adjustedTrainingDays: AiTrainingDay[]
) => {
  const today = getTaipeiDateInput();
  const activeByDate = new Map(
    activeTrainingDays.map((day) => [toDateInput(day.date), day])
  );
  const adjustedByDate = new Map<string, AiTrainingDay>();

  for (const day of adjustedTrainingDays) {
    if (!activeByDate.has(day.date)) {
      throw new Error(`adjusted_dates_out_of_range:${day.date}`);
    }
    if (!isFutureDateInput(day.date, today)) {
      throw new Error(`adjusted_dates_not_future:${day.date}`);
    }
    adjustedByDate.set(day.date, day);
  }

  const changedDates: string[] = [];
  const days = activeTrainingDays.map((day) => {
    const date = toDateInput(day.date);
    const original = toAiTrainingDay(day);
    const adjusted = adjustedByDate.get(date);
    const trainingDay = adjusted ?? original;

    if (adjusted && JSON.stringify(adjusted) !== JSON.stringify(original)) {
      changedDates.push(date);
    }

    return {
      completionStatus: adjusted ? "planned" : day.completionStatus,
      sportCategory: adjusted
        ? (inferSportCategory(adjusted.trainingType) ??
          inferSportCategory(adjusted.description))
        : day.sportCategory,
      trainingDay
    };
  });

  return { changedDates, days };
};

export async function generatePlanAdjustmentFromConversation(
  values: unknown
): Promise<AdjustmentActionResult> {
  const parsed = generatePlanAdjustmentRequestSchema.safeParse(values);

  if (!parsed.success) {
    return { ok: false, message: "請先完成調整對話，再確認產生新版本。" };
  }

  try {
    const context = await getPlanAdjustmentContext(parsed.data.trainingPlanId);
    const conversation = await prisma.trainingPlanConversation.findFirst({
      where: {
        conversationType: "adjustment",
        id: parsed.data.conversationId,
        status: "active",
        trainingPlanId: context.plan.id,
        userProfileId: context.plan.userProfileId
      },
      include: { messages: { orderBy: { createdAt: "asc" } } }
    });

    if (!conversation) {
      return { ok: false, message: "找不到可用的調整對話，請重新開始。" };
    }

    const latestAssistantMessage = [...conversation.messages]
      .reverse()
      .find((message) => message.role === "assistant");
    const conversationState = parseConversationMetadata(
      latestAssistantMessage?.metadataJson
    );

    if (
      !conversationState ||
      conversationState.readiness === "needs_more_info"
    ) {
      return {
        ok: false,
        message: `目前資訊還不足，請先補充：${
          conversationState?.missingInformation.join("、") ||
          "想調整的日期與方向"
        }。`
      };
    }

    const agentContext = toAgentContext(context);
    if (!agentContext.activeTrainingDays.length) {
      return { ok: false, message: "此計畫已沒有明天起可調整的訓練內容。" };
    }

    const messages = serializeMessages(conversation.messages);
    const adjustmentRequest =
      conversation.summary ??
      buildConversationSummary(messages, conversationState);
    const result = await createPlanAdjustmentDraft({
      ...agentContext,
      adjustmentRequest
    });
    const today = getTaipeiDateInput();
    const adjustableDateSet = new Set(
      agentContext.activeTrainingDays.map((day) => day.date)
    );
    const invalidAffectedDate = result.draft.affectedDates.find(
      (date) => !isFutureDateInput(date, today) || !adjustableDateSet.has(date)
    );
    if (invalidAffectedDate) {
      throw new Error(
        isFutureDateInput(invalidAffectedDate, today)
          ? `adjusted_dates_out_of_range:${invalidAffectedDate}`
          : `adjusted_dates_not_future:${invalidAffectedDate}`
      );
    }

    const merged = mergeAdjustedTrainingDays(
      context.activeVersion.trainingDays,
      result.draft.adjustedPlan.trainingDays
    );
    if (!merged.changedDates.length) {
      return {
        ok: false,
        message: "AI 未產生實際可辨識的未來課表變更，請補充調整方向後再試。"
      };
    }

    await prisma.$transaction(async (tx) => {
      const latestVersion = await tx.trainingPlanVersion.findFirst({
        where: { trainingPlanId: context.plan.id },
        orderBy: { versionNumber: "desc" },
        select: { versionNumber: true }
      });
      const newVersion = await tx.trainingPlanVersion.create({
        data: {
          trainingPlanId: context.plan.id,
          versionNumber: (latestVersion?.versionNumber ?? 0) + 1,
          status: "draft",
          summary: result.draft.adjustedPlan.summary,
          aiModel: result.aiModel,
          promptSnapshot: result.promptSnapshot
        },
        select: { id: true }
      });

      for (const item of merged.days) {
        const day = item.trainingDay;
        const trainingDay = await tx.trainingDay.create({
          data: {
            trainingPlanVersionId: newVersion.id,
            date: parseDateInput(day.date),
            sportCategory: item.sportCategory,
            trainingType: day.trainingType,
            targetDistanceKm: day.targetDistanceKm,
            targetDurationMin: day.targetDurationMin,
            targetPace: day.targetPace,
            targetIntensity: day.targetIntensity,
            description: day.description,
            notes: day.notes,
            recoverySuggestion: day.recoverySuggestion,
            completionStatus: item.completionStatus
          },
          select: { id: true }
        });
        await tx.nutritionSuggestion.create({
          data: {
            trainingDayId: trainingDay.id,
            ...day.nutritionSuggestion
          }
        });
      }

      await tx.planAdjustment.create({
        data: {
          trainingPlanVersionId: context.activeVersion.id,
          newTrainingPlanVersionId: newVersion.id,
          reasonType: result.draft.reasonType,
          reasonDescription: result.draft.reasonDescription,
          affectedDates: JSON.stringify(merged.changedDates),
          beforeSummary: result.draft.beforeSummary,
          afterSummary: result.draft.afterSummary,
          status: "draft",
          aiModel: result.aiModel,
          promptSnapshot: result.promptSnapshot
        }
      });
      await tx.trainingPlanConversation.update({
        where: { id: conversation.id },
        data: {
          generatedTrainingPlanVersionId: newVersion.id,
          status: "completed"
        }
      });
    });

    revalidateTrainingViews();
    return {
      ok: true,
      message: "新版草稿已產生，請先查看與原版本的差異，再決定是否啟用。"
    };
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("OPENAI_API_KEY")
        ? "目前尚未完成 AI 服務設定，無法產生計畫調整草稿。"
        : error instanceof Error &&
            error.message.startsWith("adjusted_dates_not_future")
          ? "AI 嘗試調整今天或過去日期，系統已阻止寫入，請重新產生。"
          : error instanceof Error &&
              error.message.startsWith("adjusted_dates_out_of_range")
            ? "AI 回傳了不在目前計畫內的日期，系統未建立新版。"
            : "計畫調整草稿產生失敗，請稍後再試。";
    return { ok: false, message };
  }
}

export async function confirmPlanAdjustment(
  planAdjustmentId: string
): Promise<AdjustmentActionResult> {
  try {
    const adjustment = await prisma.planAdjustment.findUnique({
      where: { id: planAdjustmentId },
      include: {
        originalVersion: {
          select: {
            trainingPlan: { select: { status: true } },
            trainingPlanId: true
          }
        },
        newVersion: { select: { id: true } }
      }
    });

    if (!adjustment?.newVersion) {
      return {
        ok: false,
        message: "找不到要啟用的調整版本，請重新整理後再試一次。"
      };
    }
    if (adjustment.originalVersion.trainingPlan.status === "archived") {
      return { ok: false, message: "此訓練計畫已封存，不能再啟用調整版本。" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.trainingPlanVersion.update({
        where: { id: adjustment.newVersion!.id },
        data: { status: "confirmed", confirmedAt: new Date() }
      });
      await tx.trainingPlan.update({
        where: { id: adjustment.originalVersion.trainingPlanId },
        data: { status: "active", activeVersionId: adjustment.newVersion!.id }
      });
      await tx.planAdjustment.update({
        where: { id: planAdjustmentId },
        data: { status: "confirmed", confirmedAt: new Date() }
      });
    });

    revalidateTrainingViews();
    return { ok: true, message: "計畫調整已確認，新版本已啟用。" };
  } catch {
    return { ok: false, message: "計畫調整確認失敗，請稍後再試。" };
  }
}
