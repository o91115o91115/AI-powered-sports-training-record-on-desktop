"use client";

import { AlertTriangle, Send, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

import {
  generateTrainingPlanFromConversation,
  sendTrainingPlanChatMessage,
  type GenerateAiPlanDraftResult,
  type SendTrainingPlanChatMessageResult,
  type TrainingPlanChatMessage
} from "@/app/planner/ai-actions";
import type { AiPlanningConversation } from "@/schemas/ai/planning-conversation";

type AiPlanChatProps = {
  disabled?: boolean;
  initialConversation?: {
    id: string;
    conversation: AiPlanningConversation | null;
    messages: TrainingPlanChatMessage[];
  } | null;
};

const readinessLabels: Record<AiPlanningConversation["readiness"], string> = {
  needs_more_info: "仍需補充資料",
  ready_to_generate: "可產生課表",
  high_risk: "有風險需保守規劃"
};

const getReadinessClass = (readiness: AiPlanningConversation["readiness"]) => {
  if (readiness === "ready_to_generate") {
    return "border-primary bg-primary/10 text-primary";
  }

  if (readiness === "high_risk") {
    return "border-danger bg-danger/10 text-danger";
  }

  return "border-line bg-background text-muted";
};

export function AiPlanChat({ disabled, initialConversation }: AiPlanChatProps) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversation?.id ?? null
  );
  const [messages, setMessages] = useState<TrainingPlanChatMessage[]>(
    initialConversation?.messages ?? []
  );
  const [conversation, setConversation] = useState<AiPlanningConversation | null>(
    initialConversation?.conversation ?? null
  );
  const [chatResult, setChatResult] = useState<SendTrainingPlanChatMessageResult | null>(null);
  const [generateResult, setGenerateResult] = useState<GenerateAiPlanDraftResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const content = input.trim();

    if (!content || disabled || isPending) {
      return;
    }

    setInput("");
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        role: "user",
        content
      }
    ]);
    setChatResult(null);
    setGenerateResult(null);

    startTransition(async () => {
      const actionResult = await sendTrainingPlanChatMessage(conversationId, content);
      setChatResult(actionResult);

      if (actionResult.ok && actionResult.conversation) {
        setConversationId(actionResult.conversationId ?? conversationId);
        setConversation(actionResult.conversation);
        setMessages(actionResult.messages ?? []);
      }
    });
  };

  const onGenerate = () => {
    setGenerateResult(null);

    startTransition(async () => {
      const actionResult = await generateTrainingPlanFromConversation({
        conversation,
        conversationId
      });
      setGenerateResult(actionResult);

      if (actionResult.ok) {
        router.refresh();
      }
    });
  };

  const canGenerate =
    Boolean(conversation) && conversation?.readiness !== "needs_more_info" && !disabled;

  return (
    <section className="rounded-lg border border-line bg-panel p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">AI 課表規劃對話</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
            先補充目標、近期能力、可訓練時間與身體狀態，AI 會整理資訊後產生草稿課表。
          </p>
        </div>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!canGenerate || isPending}
          onClick={onGenerate}
          type="button"
        >
          <Sparkles size={16} />
          {isPending ? "處理中" : "依對話產生課表"}
        </button>
      </div>

      <p className="mt-3 text-xs leading-5 text-muted">
        AI 建議不作為醫療診斷；若有疼痛、胸悶、頭暈、呼吸異常或疲勞嚴重，請降低強度並尋求專業協助。
      </p>

      {initialConversation ? (
        <p className="mt-3 text-xs leading-5 text-muted">
          已載入上次未完成的 AI 課表規劃對話，可繼續補充資訊或直接產生草稿。
        </p>
      ) : null}

      <div className="mt-5 rounded-md border border-line bg-background">
        <div className="max-h-96 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <p className="text-sm leading-6 text-muted">
              可以先告訴 AI：你的目標賽事、目前每週跑量、每週可訓練天數、最近是否有疼痛或疲勞。
            </p>
          ) : (
            messages.map((message, index) => (
              <div
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                key={`${message.role}-${index}`}
              >
                <p
                  className={`max-w-3xl rounded-md px-3 py-2 text-sm leading-6 ${
                    message.role === "user"
                      ? "bg-primary text-white"
                      : "border border-line bg-panel text-foreground"
                  }`}
                >
                  {message.content}
                </p>
              </div>
            ))
          )}
        </div>

        <form className="flex flex-col gap-3 border-t border-line p-4 sm:flex-row" onSubmit={onSubmit}>
          <textarea
            className="min-h-20 flex-1 resize-y rounded-md border border-line bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={disabled || isPending}
            onChange={(event) => setInput(event.target.value)}
            placeholder="例如：我每週可跑 4 天，最近週跑量約 25 公里，右膝偶爾緊繃，目標是 10K 跑進 55 分。"
            value={input}
          />
          <button
            className="inline-flex items-center justify-center gap-2 rounded-md border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={disabled || isPending || !input.trim()}
            type="submit"
          >
            <Send size={16} />
            送出
          </button>
        </form>
      </div>

      {conversation ? (
        <div className="mt-4 space-y-3">
          <div
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold ${getReadinessClass(
              conversation.readiness
            )}`}
          >
            {conversation.readiness === "high_risk" ? <AlertTriangle size={16} /> : null}
            {readinessLabels[conversation.readiness]}
          </div>

          {conversation.missingInformation.length ? (
            <p className="text-sm leading-6 text-muted">
              仍需補充：{conversation.missingInformation.join("、")}
            </p>
          ) : null}

          {conversation.riskWarnings.length ? (
            <div className="rounded-md border border-danger bg-danger/10 p-3 text-sm leading-6 text-danger">
              {conversation.riskWarnings.join("、")}
            </div>
          ) : null}
        </div>
      ) : null}

      {chatResult && !chatResult.ok ? (
        <p className="mt-3 text-sm font-medium text-danger">{chatResult.message}</p>
      ) : null}

      {generateResult ? (
        <p
          className={`mt-3 text-sm font-medium ${
            generateResult.ok ? "text-primary" : "text-danger"
          }`}
        >
          {generateResult.message}
        </p>
      ) : null}
    </section>
  );
}
