"use client";

import { AlertTriangle, Bot, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  generateDailyReviewFeedback,
  type ReviewFeedbackActionResult
} from "@/app/calendar/review-actions";

export type AiFeedbackPanelData = {
  id: string;
  summary: string;
  trainingAnalysis: string | null;
  nutritionAnalysis: string | null;
  riskWarning: string | null;
  nextStepSuggestion: string | null;
  shouldReplan: boolean;
  createdAt: string;
};

type AiFeedbackPanelProps = {
  canReport: boolean;
  feedback: AiFeedbackPanelData | null;
  trainingDayId: string;
  userProfileId: string;
};

export function AiFeedbackPanel({
  canReport,
  feedback,
  trainingDayId,
  userProfileId
}: AiFeedbackPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ReviewFeedbackActionResult | null>(null);

  const handleGenerate = () => {
    setResult(null);
    startTransition(async () => {
      const response = await generateDailyReviewFeedback({
        trainingDayId,
        userProfileId
      });
      setResult(response);

      if (response.ok) {
        router.refresh();
      }
    });
  };

  return (
    <section className="rounded-lg border border-line bg-panel p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-background text-primary">
            <Bot size={18} />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">AI 今日回饋</h3>
            <p className="mt-1 text-sm leading-6 text-muted">
              根據當日訓練與飲食紀錄，產生完成度、補給與風險提醒。
            </p>
          </div>
        </div>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!canReport || isPending}
          onClick={handleGenerate}
          type="button"
        >
          {isPending ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
          {feedback ? "重新產生回饋" : "產生今日回饋"}
        </button>
      </div>

      {result ? (
        <p className={`mt-3 text-sm ${result.ok ? "text-primary" : "text-danger"}`}>
          {result.message}
        </p>
      ) : null}

      {feedback ? (
        <div className="mt-4 space-y-3">
          <div className="rounded-md border border-line bg-background p-3">
            <p className="text-xs font-semibold text-muted">最近回饋</p>
            <p className="mt-2 text-sm leading-6 text-foreground">{feedback.summary}</p>
            <p className="mt-2 text-xs text-muted">產生時間：{feedback.createdAt}</p>
          </div>

          {feedback.trainingAnalysis ? (
            <div className="rounded-md border border-line bg-background p-3">
              <p className="text-xs font-semibold text-muted">訓練分析</p>
              <p className="mt-2 text-sm leading-6 text-foreground">
                {feedback.trainingAnalysis}
              </p>
            </div>
          ) : null}

          {feedback.nutritionAnalysis ? (
            <div className="rounded-md border border-line bg-background p-3">
              <p className="text-xs font-semibold text-muted">飲食分析</p>
              <p className="mt-2 text-sm leading-6 text-foreground">
                {feedback.nutritionAnalysis}
              </p>
            </div>
          ) : null}

          {feedback.riskWarning ? (
            <div className="rounded-md border border-danger/30 bg-danger/10 p-3 text-danger">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} />
                <p className="text-sm font-semibold">風險提醒</p>
              </div>
              <p className="mt-2 text-sm leading-6">{feedback.riskWarning}</p>
            </div>
          ) : null}

          <div className="rounded-md border border-line bg-background p-3">
            <p className="text-xs font-semibold text-muted">下一步建議</p>
            <p className="mt-2 text-sm leading-6 text-foreground">
              {feedback.nextStepSuggestion ?? "尚未提供下一步建議。"}
            </p>
            {feedback.shouldReplan ? (
              <div className="mt-2 rounded-md border border-accent bg-accent/10 p-2 text-sm text-accent">
                <p>AI 建議後續檢視是否需要調整訓練計畫。</p>
                <Link className="mt-2 inline-flex font-semibold underline" href="/adjustments">
                  前往計畫調整
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-md border border-line bg-background p-3 text-sm leading-6 text-muted">
          尚未產生今日回饋。請先確認當日已有實際訓練或飲食紀錄，再產生回饋會更有參考價值。
        </p>
      )}
    </section>
  );
}
