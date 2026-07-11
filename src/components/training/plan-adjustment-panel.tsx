"use client";

import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  confirmPlanAdjustment,
  generatePlanAdjustmentDraft,
  type AdjustmentActionResult
} from "@/app/adjustments/actions";

export type PlanAdjustmentItem = {
  id: string;
  reasonType: string;
  reasonDescription: string | null;
  affectedDates: string | null;
  beforeSummary: string | null;
  afterSummary: string | null;
  status: string;
  createdAt: string;
  newVersion: {
    id: string;
    versionNumber: number;
    trainingDaysCount: number;
  } | null;
};

type PlanAdjustmentPanelProps = {
  activeVersionLabel: string;
  adjustments: PlanAdjustmentItem[];
  planId: string;
};

const statusLabels: Record<string, string> = {
  draft: "待確認",
  confirmed: "已確認",
  rejected: "已拒絕",
  archived: "已封存"
};

const reasonTypeLabels: Record<string, string> = {
  fatigue: "疲勞",
  pain: "疼痛",
  missed_workout: "未完成訓練",
  nutrition: "飲食補給",
  schedule: "行程",
  performance: "表現變化",
  other: "其他"
};

const parseAffectedDates = (value: string | null) => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
};

export function PlanAdjustmentPanel({
  activeVersionLabel,
  adjustments,
  planId
}: PlanAdjustmentPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [adjustmentRequest, setAdjustmentRequest] = useState("");
  const [result, setResult] = useState<AdjustmentActionResult | null>(null);

  const runAction = (action: () => Promise<AdjustmentActionResult>) => {
    setResult(null);
    startTransition(async () => {
      const actionResult = await action();
      setResult(actionResult);

      if (actionResult.ok) {
        router.refresh();
      }
    });
  };

  return (
    <section className="rounded-lg border border-line bg-panel p-5">
      <div className="flex flex-col gap-3 border-b border-line pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">AI 計畫調整</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            目前版本：{activeVersionLabel}。產生調整草稿後，需手動確認才會啟用新版。
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <textarea
          className="min-h-24 w-full resize-y rounded-md border border-line bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending}
          onChange={(event) => setAdjustmentRequest(event.target.value)}
          placeholder="例如：週三不要排間歇，長跑改到週日；或最近疲勞偏高，請降低本週強度。"
          value={adjustmentRequest}
        />
        <button
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending || adjustmentRequest.trim().length < 5}
          onClick={() =>
            runAction(() =>
              generatePlanAdjustmentDraft({
                adjustmentRequest,
                trainingPlanId: planId
              })
            )
          }
          type="button"
        >
          {isPending ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
          依需求產生調整草稿
        </button>
      </div>

      {result ? (
        <p className={`mt-3 text-sm ${result.ok ? "text-primary" : "text-danger"}`}>
          {result.message}
        </p>
      ) : null}

      <div className="mt-4 space-y-3">
        {adjustments.length === 0 ? (
          <p className="rounded-md border border-line bg-background p-4 text-sm leading-6 text-muted">
            目前沒有計畫調整草稿。
          </p>
        ) : (
          adjustments.map((adjustment) => {
            const affectedDates = parseAffectedDates(adjustment.affectedDates);
            const canConfirm = adjustment.status === "draft" && adjustment.newVersion;

            return (
              <article className="rounded-md border border-line bg-background p-4" key={adjustment.id}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-panel px-2 py-1 text-xs font-semibold text-muted">
                        {reasonTypeLabels[adjustment.reasonType] ?? adjustment.reasonType}
                      </span>
                      <span className="rounded-md bg-panel px-2 py-1 text-xs font-semibold text-muted">
                        {statusLabels[adjustment.status] ?? adjustment.status}
                      </span>
                      <span className="text-xs text-muted">{adjustment.createdAt}</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-foreground">
                      {adjustment.reasonDescription ?? "未提供調整原因。"}
                    </p>
                  </div>

                  {canConfirm ? (
                    <button
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-primary px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isPending}
                      onClick={() => runAction(() => confirmPlanAdjustment(adjustment.id))}
                      type="button"
                    >
                      <CheckCircle2 size={15} />
                      確認啟用新版
                    </button>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-md border border-line bg-panel p-3">
                    <p className="text-xs font-semibold text-muted">調整前</p>
                    <p className="mt-2 text-sm leading-6 text-foreground">
                      {adjustment.beforeSummary ?? "未提供調整前摘要。"}
                    </p>
                  </div>
                  <div className="rounded-md border border-line bg-panel p-3">
                    <p className="text-xs font-semibold text-muted">調整後</p>
                    <p className="mt-2 text-sm leading-6 text-foreground">
                      {adjustment.afterSummary ?? "未提供調整後摘要。"}
                    </p>
                  </div>
                </div>

                {affectedDates.length > 0 ? (
                  <p className="mt-3 text-xs leading-5 text-muted">
                    受影響日期：{affectedDates.join("、")}
                  </p>
                ) : null}

                {adjustment.newVersion ? (
                  <p className="mt-2 text-xs leading-5 text-muted">
                    新版草稿：V{adjustment.newVersion.versionNumber}，
                    {adjustment.newVersion.trainingDaysCount} 天。
                  </p>
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
