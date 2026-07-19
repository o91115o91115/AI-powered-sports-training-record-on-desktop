"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Send,
  Sparkles
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState, useTransition } from "react";

import {
  confirmPlanAdjustment,
  generatePlanAdjustmentFromConversation,
  restartPlanAdjustmentConversation,
  sendPlanAdjustmentChatMessage,
  type AdjustmentActionResult,
  type PlanAdjustmentChatActionResult
} from "@/app/adjustments/actions";
import type { AiPlanAdjustmentConversation } from "@/schemas/ai/replanning";
import { getMeaningfulAdjustmentText } from "@/lib/plan-adjustment-conversation";
import type {
  PlanAdjustmentConversationItem,
  PlanAdjustmentDraftItem,
  PlanAdjustmentFeedbackItem
} from "@/types/plan-adjustment";

type PlanAdjustmentPanelProps = {
  activeVersionLabel: string;
  currentDraft: PlanAdjustmentDraftItem | null;
  feedback: PlanAdjustmentFeedbackItem[];
  initialConversation: PlanAdjustmentConversationItem | null;
  planId: string;
  sourceFeedbackId?: string;
};

const readinessLabels: Record<
  AiPlanAdjustmentConversation["readiness"],
  string
> = {
  needs_more_info: "仍需補充資料",
  ready_to_generate: "可產生新版",
  high_risk: "有風險，將採保守調整"
};

export function PlanAdjustmentPanel({
  activeVersionLabel,
  currentDraft,
  feedback,
  initialConversation,
  planId,
  sourceFeedbackId
}: PlanAdjustmentPanelProps) {
  const router = useRouter();
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversation?.id ?? null
  );
  const [conversation, setConversation] =
    useState<AiPlanAdjustmentConversation | null>(
      initialConversation?.conversation ?? null
    );
  const [messages, setMessages] = useState(initialConversation?.messages ?? []);
  const [chatResult, setChatResult] =
    useState<PlanAdjustmentChatActionResult | null>(null);
  const [actionResult, setActionResult] =
    useState<AdjustmentActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }
  }, [messages.length]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const userMessage = input.trim();
    if (!userMessage || isPending || currentDraft) return;

    setInput("");
    setMessages((current) => [
      ...current,
      { role: "user", content: userMessage }
    ]);
    setChatResult(null);
    setActionResult(null);

    startTransition(async () => {
      const result = await sendPlanAdjustmentChatMessage({
        trainingPlanId: planId,
        conversationId,
        feedbackId: sourceFeedbackId ?? null,
        userMessage
      });
      setChatResult(result);

      if (result.ok) {
        setConversationId(result.conversationId ?? conversationId);
        setConversation(result.conversation ?? null);
        setMessages(result.messages ?? []);
      }
    });
  };

  const onGenerate = () => {
    if (!conversationId) return;
    setActionResult(null);
    startTransition(async () => {
      const result = await generatePlanAdjustmentFromConversation({
        trainingPlanId: planId,
        conversationId
      });
      setActionResult(result);
      if (result.ok) router.refresh();
    });
  };

  const onRestart = () => {
    setChatResult(null);
    setActionResult(null);
    startTransition(async () => {
      const result = await restartPlanAdjustmentConversation(
        conversationId,
        planId
      );
      setActionResult(result);
      if (result.ok) {
        setConversationId(null);
        setConversation(null);
        setMessages([]);
        setInput("");
        router.refresh();
      }
    });
  };

  const onConfirmDraft = () => {
    if (!currentDraft) return;
    setActionResult(null);
    startTransition(async () => {
      const result = await confirmPlanAdjustment(currentDraft.id);
      setActionResult(result);
      if (result.ok) router.push("/calendar");
    });
  };

  const canGenerate =
    Boolean(conversationId && conversation) &&
    conversation?.readiness !== "needs_more_info" &&
    !currentDraft;
  const adjustmentSummary = getMeaningfulAdjustmentText(
    conversation?.adjustmentSummary
  );

  return (
    <div className="flex flex-col gap-5">
      <section className="order-2 rounded-lg border border-primary/40 bg-panel p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
            3
          </span>
          <p className="text-xs font-semibold tracking-wide text-primary">
            對話調整
          </p>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              對話式計畫調整
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              目前版本：{activeVersionLabel}。AI
              會先釐清方向，只有你確認後才產生新版草稿。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-semibold text-muted transition hover:border-danger hover:text-danger disabled:cursor-not-allowed disabled:opacity-60"
              disabled={
                isPending ||
                (!conversationId && messages.length === 0) ||
                Boolean(currentDraft)
              }
              onClick={onRestart}
              type="button"
            >
              <RotateCcw size={15} />
              放棄本次對話
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canGenerate || isPending}
              onClick={onGenerate}
              type="button"
            >
              {isPending ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Sparkles size={16} />
              )}
              確認產生新版本
            </button>
          </div>
        </div>

        <p className="mt-3 text-xs leading-5 text-muted">
          今天與過去日期不會調整；若有疼痛、嚴重疲勞或其他異常，請先降低強度並尋求專業協助。AI
          建議不作為醫療診斷。
        </p>

        <div className="mt-5 rounded-md border border-line bg-background">
          <div
            className="max-h-96 space-y-3 overflow-y-auto p-4"
            ref={messagesContainerRef}
          >
            {messages.length === 0 ? (
              <p className="text-sm leading-6 text-muted">
                請描述想調整的日期、行程、訓練內容或身體狀態。例如：下週三無法訓練，希望將間歇移到週四並降低本週總強度。
              </p>
            ) : (
              messages.map((message, index) => (
                <div
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  key={`${message.role}-${index}`}
                >
                  <p
                    className={`max-w-3xl whitespace-pre-wrap rounded-md px-3 py-2 text-sm leading-6 ${
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

          <form
            className="flex flex-col gap-3 border-t border-line p-4 sm:flex-row"
            onSubmit={onSubmit}
          >
            <textarea
              className="min-h-20 flex-1 resize-y rounded-md border border-line bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isPending || Boolean(currentDraft)}
              onChange={(event) => setInput(event.target.value)}
              placeholder="詳細描述希望保留、移動、降低或增加的未來訓練安排。"
              value={input}
            />
            <button
              className="inline-flex items-center justify-center gap-2 rounded-md border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isPending || Boolean(currentDraft) || !input.trim()}
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
              className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold ${
                conversation.readiness === "high_risk"
                  ? "border-danger bg-danger/10 text-danger"
                  : conversation.readiness === "ready_to_generate"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-line bg-background text-muted"
              }`}
            >
              {conversation.readiness === "high_risk" ? (
                <AlertTriangle size={16} />
              ) : null}
              {readinessLabels[conversation.readiness]}
            </div>
            {adjustmentSummary ? (
              <p className="rounded-md border border-line bg-background p-3 text-sm leading-6 text-foreground">
                目前理解：{adjustmentSummary}
              </p>
            ) : null}
            {conversation.missingInformation.length ? (
              <p className="text-sm leading-6 text-muted">
                仍需補充：{conversation.missingInformation.join("、")}
              </p>
            ) : null}
            {conversation.riskWarnings.length ? (
              <p className="whitespace-pre-line rounded-md border border-danger/30 bg-danger/10 p-3 text-sm leading-6 text-danger">
                {conversation.riskWarnings.join("\n")}
              </p>
            ) : null}
          </div>
        ) : null}

        {chatResult && !chatResult.ok ? (
          <p className="mt-3 text-sm font-medium text-danger">
            {chatResult.message}
          </p>
        ) : null}
        {actionResult ? (
          <p
            className={`mt-3 text-sm font-medium ${actionResult.ok ? "text-primary" : "text-danger"}`}
          >
            {actionResult.message}
          </p>
        ) : null}
      </section>

      <section className="order-1 rounded-lg border border-primary/40 bg-panel p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
            2
          </span>
          <p className="text-xs font-semibold tracking-wide text-primary">
            閱讀建議
          </p>
        </div>
        <h2 className="text-lg font-semibold text-foreground">最近建議內容</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          開始對話時，AI 會一併閱讀以下近期建議與風險提醒。
        </p>
        {feedback.length ? (
          <div className="mt-4 space-y-3">
            {feedback.map((item) => (
              <article
                className={`rounded-md border p-3 ${
                  item.id === sourceFeedbackId
                    ? "border-accent bg-accent/10"
                    : "border-line bg-background"
                }`}
                key={item.id}
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span>{item.createdAt}</span>
                  {item.id === sourceFeedbackId ? (
                    <span className="rounded bg-accent px-2 py-0.5 font-semibold text-white">
                      連結來源
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm leading-6 text-foreground">
                  {item.summary}
                </p>
                {item.riskWarning ? (
                  <p className="mt-2 text-sm leading-6 text-danger">
                    {item.riskWarning}
                  </p>
                ) : null}
                {item.nextStepSuggestion ? (
                  <p className="mt-2 text-sm leading-6 text-muted">
                    下一步：{item.nextStepSuggestion}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-md border border-line bg-background p-3 text-sm text-muted">
            目前沒有可引用的近期建議；AI 會根據現有紀錄提問，不會自行編造。
          </p>
        )}
      </section>

      {currentDraft ? (
        <section className="order-3 rounded-lg border border-primary bg-panel p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
              4
            </span>
            <p className="text-xs font-semibold tracking-wide text-primary">
              比較並啟用
            </p>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                本次新版差異
              </h2>
              <p className="mt-1 text-sm text-muted">
                V{currentDraft.originalVersionNumber} → V
                {currentDraft.newVersionNumber}，目前仍是草稿。
              </p>
            </div>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isPending}
              onClick={onConfirmDraft}
              type="button"
            >
              <CheckCircle2 size={16} />
              確認啟用新版
            </button>
          </div>

          <p className="mt-4 text-sm leading-6 text-foreground">
            {currentDraft.reasonDescription ?? "未提供調整原因。"}
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-md border border-line bg-background p-3">
              <p className="text-xs font-semibold text-muted">調整前</p>
              <p className="mt-2 text-sm leading-6 text-foreground">
                {currentDraft.beforeSummary ?? "未提供調整前摘要。"}
              </p>
            </div>
            <div className="rounded-md border border-line bg-background p-3">
              <p className="text-xs font-semibold text-muted">調整後</p>
              <p className="mt-2 text-sm leading-6 text-foreground">
                {currentDraft.afterSummary ?? "未提供調整後摘要。"}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {currentDraft.differences.map((day) => (
              <article
                className="rounded-md border border-line bg-background p-4"
                key={day.date}
              >
                <h3 className="font-semibold text-foreground">{day.date}</h3>
                <div className="mt-3 space-y-2">
                  {day.changes.map((change) => (
                    <div
                      className="grid gap-1 text-sm md:grid-cols-[120px_1fr_24px_1fr]"
                      key={change.field}
                    >
                      <span className="font-semibold text-muted">
                        {change.field}
                      </span>
                      <span className="text-foreground">{change.before}</span>
                      <span className="text-center text-muted">→</span>
                      <span className="text-primary">{change.after}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="order-3 rounded-lg border border-dashed border-line bg-panel p-5">
          <div className="flex items-start gap-3">
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-line text-xs font-bold text-muted">
              4
            </span>
            <div>
              <h2 className="font-semibold text-foreground">比較並啟用新版</h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                完成對話並確認產生新版本後，這裡會顯示調整前後差異與啟用按鈕。
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
