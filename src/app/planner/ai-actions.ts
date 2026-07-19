"use server";

import { prisma } from "@/lib/prisma";
import { revalidateTrainingViews } from "@/lib/revalidate-training-views";
import { inferSportCategory } from "@/lib/sport-category";
import {
  aiPlanningConversationSchema,
  type AiPlanningConversation,
  type PlanningConversationMessage
} from "@/schemas/ai/planning-conversation";
import { continueTrainingPlanConversation } from "@/services/ai/conversation-agent";
import { createTrainingPlanDraft } from "@/services/ai/planning-agent";

export type GenerateAiPlanDraftResult = {
  ok: boolean;
  message: string;
};

export type TrainingPlanChatMessage = PlanningConversationMessage;

export type SendTrainingPlanChatMessageResult = {
  ok: boolean;
  message: string;
  conversationId?: string;
  conversation?: AiPlanningConversation;
  messages?: TrainingPlanChatMessage[];
};

export type GenerateTrainingPlanFromConversationInput = {
  conversationId: string | null;
  conversation: AiPlanningConversation | null;
};

export type RestartTrainingPlanConversationResult = {
  ok: boolean;
  message: string;
};

const getRequiredPlannerContext = async () => {
  const userProfile = await prisma.userProfile.findFirst({
    include: {
      trainingGoals: {
        orderBy: { updatedAt: "desc" },
        take: 1
      }
    },
    orderBy: { updatedAt: "desc" }
  });

  if (!userProfile) {
    throw new Error("missing_profile");
  }

  const trainingGoal = userProfile.trainingGoals[0];

  if (!trainingGoal) {
    throw new Error("missing_goal");
  }

  return { trainingGoal, userProfile };
};

const parseAiDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("invalid_ai_date");
  }

  return date;
};

const sanitizeMessages = (messages: TrainingPlanChatMessage[]) =>
  messages
    .filter(
      (message) =>
        (message.role === "user" || message.role === "assistant") &&
        message.content.trim().length > 0
    )
    .slice(-12)
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 2000)
    }));

const serializeMessages = (
  messages: Array<{ role: string; content: string }>
): TrainingPlanChatMessage[] =>
  messages
    .filter(
      (message): message is TrainingPlanChatMessage =>
        (message.role === "user" || message.role === "assistant") &&
        message.content.trim().length > 0
    )
    .map((message) => ({
      role: message.role,
      content: message.content
    }));

const getRiskLevel = (conversation: AiPlanningConversation) => {
  if (conversation.readiness === "high_risk") {
    return "high_risk";
  }

  return conversation.riskWarnings.length ? "caution" : "normal";
};

const buildConversationSummary = (
  messages: TrainingPlanChatMessage[],
  conversation: AiPlanningConversation
) => {
  const facts = conversation.collectedFacts;
  const messageHistory = sanitizeMessages(messages)
    .map(
      (message) =>
        `${message.role === "user" ? "使用者" : "AI"}：${message.content}`
    )
    .join("\n");

  // 對話摘要會併入最終課表 prompt 與 promptSnapshot，讓課表決策可追溯。
  return `對話狀態：${conversation.readiness}
已知目標：${facts.goal ?? "未整理"}
目前能力：${facts.currentFitness ?? "未整理"}
每週可安排訓練日上限（不含休息日）：${facts.weeklyAvailability ?? "未整理"}
傷痛或疼痛：${facts.injuryOrPain ?? "未整理"}
疲勞狀態：${facts.fatigue ?? "未整理"}
訓練偏好：${facts.preferences ?? "未整理"}
飲食限制：${facts.nutritionLimits ?? "未整理"}
仍需補充：${conversation.missingInformation.length ? conversation.missingInformation.join("、") : "無"}
風險提醒：${conversation.riskWarnings.length ? conversation.riskWarnings.join("、") : "無"}

最近對話：
${messageHistory}`;
};

const parseConversationMetadata = (metadataJson: string | null | undefined) => {
  if (!metadataJson) {
    return null;
  }

  try {
    const parsed = aiPlanningConversationSchema.safeParse(
      JSON.parse(metadataJson)
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

async function getOrCreateActiveConversation(
  userProfileId: string,
  trainingGoalId: string
) {
  const activeConversation = await prisma.trainingPlanConversation.findFirst({
    where: {
      conversationType: "planning",
      status: "active",
      trainingGoalId,
      userProfileId
    },
    orderBy: { updatedAt: "desc" }
  });

  if (activeConversation) {
    return activeConversation;
  }

  return prisma.trainingPlanConversation.create({
    data: {
      conversationType: "planning",
      readiness: "needs_more_info",
      riskLevel: "normal",
      status: "active",
      trainingGoalId,
      userProfileId
    }
  });
}

async function persistAiTrainingPlanDraft(
  userProfile: Awaited<
    ReturnType<typeof getRequiredPlannerContext>
  >["userProfile"],
  trainingGoal: Awaited<
    ReturnType<typeof getRequiredPlannerContext>
  >["trainingGoal"],
  aiResult: Awaited<ReturnType<typeof createTrainingPlanDraft>>
) {
  return prisma.$transaction(async (tx) => {
    const plan = await tx.trainingPlan.create({
      data: {
        userProfileId: userProfile.id,
        trainingGoalId: trainingGoal.id,
        title: aiResult.draft.title,
        status: "draft",
        startDate: parseAiDate(aiResult.draft.startDate),
        endDate: parseAiDate(aiResult.draft.endDate)
      }
    });

    const version = await tx.trainingPlanVersion.create({
      data: {
        trainingPlanId: plan.id,
        versionNumber: 1,
        status: "draft",
        summary: `${aiResult.draft.summary}\n\n${aiResult.draft.trainingCycleSummary}`,
        aiModel: aiResult.aiModel,
        promptSnapshot: aiResult.promptSnapshot
      }
    });

    for (const day of aiResult.draft.trainingDays) {
      const trainingDay = await tx.trainingDay.create({
        data: {
          trainingPlanVersionId: version.id,
          date: parseAiDate(day.date),
          sportCategory:
            inferSportCategory(day.trainingType) ??
            inferSportCategory(day.description),
          trainingType: day.trainingType,
          targetDistanceKm: day.targetDistanceKm,
          targetDurationMin: day.targetDurationMin,
          targetPace: day.targetPace,
          targetIntensity: day.targetIntensity,
          description: day.description,
          notes: [day.notes, ...aiResult.draft.riskWarnings]
            .filter(Boolean)
            .join("\n"),
          recoverySuggestion: day.recoverySuggestion,
          completionStatus: "planned"
        }
      });

      await tx.nutritionSuggestion.create({
        data: {
          trainingDayId: trainingDay.id,
          carbSuggestion: day.nutritionSuggestion.carbSuggestion,
          proteinSuggestion: day.nutritionSuggestion.proteinSuggestion,
          hydrationSuggestion: day.nutritionSuggestion.hydrationSuggestion,
          preWorkoutSuggestion: day.nutritionSuggestion.preWorkoutSuggestion,
          postWorkoutSuggestion: day.nutritionSuggestion.postWorkoutSuggestion,
          longRunFuelSuggestion: day.nutritionSuggestion.longRunFuelSuggestion,
          restDaySuggestion: day.nutritionSuggestion.restDaySuggestion,
          estimateNote: day.nutritionSuggestion.estimateNote
        }
      });
    }

    return version.id;
  });
}

const getDraftSuccessMessage = (missingInformation: string[]) => {
  const missingInfo = missingInformation.length
    ? ` AI 也標示仍需補充：${missingInformation.join("、")}。`
    : "";

  return `AI 訓練計畫草稿已建立，請確認內容後再套用。${missingInfo}`;
};

export async function generateAiTrainingPlanDraft(): Promise<GenerateAiPlanDraftResult> {
  try {
    const { trainingGoal, userProfile } = await getRequiredPlannerContext();

    if (
      !trainingGoal.currentWeeklyMileageKm ||
      !trainingGoal.weeklyTrainingDays
    ) {
      return {
        ok: false,
        message: "目前訓練資料不足，請先補上目前週跑量與每週可訓練天數。"
      };
    }

    const aiResult = await createTrainingPlanDraft({
      trainingGoal,
      userProfile
    });

    await persistAiTrainingPlanDraft(userProfile, trainingGoal, aiResult);
    revalidateTrainingViews();

    return {
      ok: true,
      message: getDraftSuccessMessage(aiResult.draft.missingInformation)
    };
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === "missing_profile" ||
        error.message === "missing_goal"
      ) {
        return {
          ok: false,
          message: "請先完成使用者基本資料與訓練目標，再產生 AI 計畫草稿。"
        };
      }

      if (error.message === "OPENAI_API_KEY is not configured.") {
        return {
          ok: false,
          message: "目前尚未完成 AI 服務設定，無法產生 AI 計畫草稿。"
        };
      }

      if (error.message === "invalid_ai_date") {
        return {
          ok: false,
          message: "AI 回傳日期格式不正確，未寫入資料庫，請重新產生。"
        };
      }
    }

    return {
      ok: false,
      message: "AI 計畫草稿產生失敗，請稍後再試，或先補齊使用者目標資料。"
    };
  }
}

export async function sendTrainingPlanChatMessage(
  conversationId: string | null,
  userMessage: string
): Promise<SendTrainingPlanChatMessageResult> {
  try {
    const content = userMessage.trim().slice(0, 2000);

    if (!content) {
      return {
        ok: false,
        message: "請先輸入想補充的訓練目標、目前能力或限制。"
      };
    }

    const { trainingGoal, userProfile } = await getRequiredPlannerContext();
    const conversation = conversationId
      ? await prisma.trainingPlanConversation.findFirst({
          where: {
            conversationType: "planning",
            id: conversationId,
            status: "active",
            trainingGoalId: trainingGoal.id,
            userProfileId: userProfile.id
          }
        })
      : await getOrCreateActiveConversation(userProfile.id, trainingGoal.id);

    const activeConversation =
      conversation ??
      (await getOrCreateActiveConversation(userProfile.id, trainingGoal.id));

    await prisma.trainingPlanConversationMessage.create({
      data: {
        content,
        conversationId: activeConversation.id,
        role: "user"
      }
    });

    const persistedMessages =
      await prisma.trainingPlanConversationMessage.findMany({
        where: { conversationId: activeConversation.id },
        orderBy: { createdAt: "asc" }
      });
    const serializedMessages = serializeMessages(persistedMessages);
    const aiResult = await continueTrainingPlanConversation({
      messages: serializedMessages,
      trainingGoal,
      userProfile
    });
    const nextMessages: TrainingPlanChatMessage[] = [
      ...serializedMessages,
      {
        role: "assistant",
        content: aiResult.result.assistantMessage
      }
    ];
    const summary = buildConversationSummary(nextMessages, aiResult.result);

    await prisma.$transaction(async (tx) => {
      await tx.trainingPlanConversationMessage.create({
        data: {
          content: aiResult.result.assistantMessage,
          conversationId: activeConversation.id,
          metadataJson: JSON.stringify(aiResult.result),
          role: "assistant"
        }
      });

      await tx.trainingPlanConversation.update({
        where: { id: activeConversation.id },
        data: {
          readiness: aiResult.result.readiness,
          riskLevel: getRiskLevel(aiResult.result),
          summary
        }
      });
    });

    return {
      ok: true,
      message: aiResult.result.assistantMessage,
      conversationId: activeConversation.id,
      conversation: aiResult.result,
      messages: nextMessages
    };
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === "missing_profile" ||
        error.message === "missing_goal"
      ) {
        return {
          ok: false,
          message: "請先完成使用者基本資料與訓練目標，再開始 AI 課表規劃對話。"
        };
      }

      if (error.message === "OPENAI_API_KEY is not configured.") {
        return {
          ok: false,
          message: "目前尚未完成 AI 服務設定，無法開始 AI 課表規劃對話。"
        };
      }
    }

    return {
      ok: false,
      message: "AI 對話回覆失敗，請稍後再試，或改用較簡短的描述。"
    };
  }
}

export async function restartTrainingPlanConversation(
  conversationId: string | null
): Promise<RestartTrainingPlanConversationResult> {
  try {
    if (!conversationId) {
      return {
        ok: true,
        message: "已準備開始新的 AI 課表規劃對話。"
      };
    }

    const { trainingGoal, userProfile } = await getRequiredPlannerContext();
    const conversation = await prisma.trainingPlanConversation.findFirst({
      where: {
        conversationType: "planning",
        id: conversationId,
        status: "active",
        trainingGoalId: trainingGoal.id,
        userProfileId: userProfile.id
      },
      select: { id: true }
    });

    if (!conversation) {
      return {
        ok: true,
        message: "目前沒有進行中的 AI 對話，已可重新開始。"
      };
    }

    await prisma.trainingPlanConversation.update({
      where: { id: conversation.id },
      data: {
        status: "discarded"
      }
    });

    revalidateTrainingViews();

    return {
      ok: true,
      message: "已放棄本次 AI 對話，可以重新開始新的課表規劃。"
    };
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === "missing_profile" ||
        error.message === "missing_goal"
      ) {
        return {
          ok: false,
          message: "請先完成使用者基本資料與訓練目標，再重新開始 AI 對話。"
        };
      }
    }

    return {
      ok: false,
      message: "重新開始 AI 對話失敗，請稍後再試。"
    };
  }
}

export async function generateTrainingPlanFromConversation(
  input: GenerateTrainingPlanFromConversationInput
): Promise<GenerateAiPlanDraftResult> {
  try {
    if (!input.conversationId) {
      return {
        ok: false,
        message: "請先與 AI 對話，讓系統整理目標、能力與風險後再產生課表。"
      };
    }

    const { trainingGoal, userProfile } = await getRequiredPlannerContext();
    const persistedConversation =
      await prisma.trainingPlanConversation.findFirst({
        where: {
          conversationType: "planning",
          id: input.conversationId,
          status: "active",
          trainingGoalId: trainingGoal.id,
          userProfileId: userProfile.id
        },
        include: {
          messages: {
            orderBy: { createdAt: "asc" }
          }
        }
      });

    if (!persistedConversation) {
      return {
        ok: false,
        message: "找不到可用的 AI 對話紀錄，請重新開始課表規劃對話。"
      };
    }

    const latestAssistantMessage = [...persistedConversation.messages]
      .reverse()
      .find((message) => message.role === "assistant");
    const latestConversation =
      parseConversationMetadata(latestAssistantMessage?.metadataJson) ??
      input.conversation;

    if (!latestConversation) {
      return {
        ok: false,
        message:
          "對話摘要尚未建立，請先送出一則訊息讓 AI 整理資料後再產生課表。"
      };
    }

    if (latestConversation.readiness === "needs_more_info") {
      return {
        ok: false,
        message: `目前資訊還不足以產生合理課表，請先補充：${latestConversation.missingInformation.join("、") || "訓練目標、目前能力與可訓練時間"}。`
      };
    }

    const messages = serializeMessages(persistedConversation.messages);
    const conversationSummary =
      persistedConversation.summary ??
      buildConversationSummary(messages, latestConversation);
    const aiResult = await createTrainingPlanDraft({
      conversationSummary,
      trainingGoal,
      userProfile
    });

    const generatedTrainingPlanVersionId = await persistAiTrainingPlanDraft(
      userProfile,
      trainingGoal,
      aiResult
    );
    await prisma.trainingPlanConversation.update({
      where: { id: persistedConversation.id },
      data: {
        generatedTrainingPlanVersionId,
        readiness: latestConversation.readiness,
        riskLevel: getRiskLevel(latestConversation),
        status: "completed",
        summary: conversationSummary
      }
    });
    revalidateTrainingViews();

    return {
      ok: true,
      message: getDraftSuccessMessage(aiResult.draft.missingInformation)
    };
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === "missing_profile" ||
        error.message === "missing_goal"
      ) {
        return {
          ok: false,
          message: "請先完成使用者基本資料與訓練目標，再產生 AI 計畫草稿。"
        };
      }

      if (error.message === "OPENAI_API_KEY is not configured.") {
        return {
          ok: false,
          message: "目前尚未完成 AI 服務設定，無法產生 AI 計畫草稿。"
        };
      }

      if (error.message === "invalid_ai_date") {
        return {
          ok: false,
          message: "AI 回傳日期格式不正確，未寫入資料庫，請重新產生。"
        };
      }
    }

    return {
      ok: false,
      message: "AI 計畫草稿產生失敗，請稍後再試，或先補齊對話中的關鍵資料。"
    };
  }
}
