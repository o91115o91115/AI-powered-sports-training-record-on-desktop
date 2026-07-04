"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  generateAiTrainingPlanDraft,
  type GenerateAiPlanDraftResult
} from "@/app/planner/ai-actions";

type AiPlanGeneratorProps = {
  disabled?: boolean;
};

export function AiPlanGenerator({ disabled }: AiPlanGeneratorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<GenerateAiPlanDraftResult | null>(null);

  const onGenerate = () => {
    setResult(null);
    startTransition(async () => {
      const actionResult = await generateAiTrainingPlanDraft();
      setResult(actionResult);

      if (actionResult.ok) {
        router.refresh();
      }
    });
  };

  return (
    <section className="rounded-lg border border-line bg-panel p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">AI 產生訓練計畫草稿</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
            根據使用者資料與訓練目標產生草稿版本。草稿不會自動套用，需由使用者確認後才會成為正式計畫。
          </p>
        </div>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled || isPending}
          onClick={onGenerate}
          type="button"
        >
          <Sparkles size={16} />
          {isPending ? "產生中" : "產生 AI 草稿"}
        </button>
      </div>

      <p className="mt-3 text-xs leading-5 text-muted">
        AI 建議不作為醫療診斷；若有疼痛、胸悶、頭暈、呼吸異常或疲勞嚴重，請降低強度並尋求專業協助。
      </p>

      {result ? (
        <p className={`mt-3 text-sm font-medium ${result.ok ? "text-primary" : "text-danger"}`}>
          {result.message}
        </p>
      ) : null}
    </section>
  );
}
