"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { PlanAdjustmentPanel } from "@/components/training/plan-adjustment-panel";
import type { AdjustablePlanItem } from "@/types/plan-adjustment";

type PlanAdjustmentSelectorProps = {
  initialPlanId?: string;
  plans: AdjustablePlanItem[];
  sourceFeedbackId?: string;
  syncSelectionToUrl?: boolean;
};

export function PlanAdjustmentSelector({
  initialPlanId,
  plans,
  sourceFeedbackId,
  syncSelectionToUrl = false
}: PlanAdjustmentSelectorProps) {
  const router = useRouter();
  const defaultPlanId = plans.some((plan) => plan.id === initialPlanId)
    ? initialPlanId!
    : (plans[0]?.id ?? "");
  const [selectedPlanId, setSelectedPlanId] = useState(defaultPlanId);
  const selectedPlan =
    plans.find((plan) => plan.id === selectedPlanId) ?? plans[0];

  if (!selectedPlan) {
    return (
      <div className="rounded-lg border border-line bg-panel p-5 text-sm text-muted">
        目前沒有可調整的使用中計畫，請先建立並確認一個計畫版本。
      </div>
    );
  }

  const onSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    if (syncSelectionToUrl) {
      router.replace(`/adjustments?planId=${encodeURIComponent(planId)}`);
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-line bg-panel p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          調整流程
        </p>
        <h2 className="mt-2 text-lg font-semibold text-foreground">
          依照四個步驟完成計畫調整
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["1", "選擇計畫", "確認目前使用的版本"],
            ["2", "閱讀建議", "掌握近期狀態與風險"],
            ["3", "對話調整", "詳細說明希望修改的方向"],
            ["4", "比較並啟用", "確認差異後套用新版"]
          ].map(([step, title, description]) => (
            <div
              className="rounded-md border border-line bg-background p-3"
              key={step}
            >
              <div className="flex items-center gap-2">
                <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  {step}
                </span>
                <p className="text-sm font-semibold text-foreground">{title}</p>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-primary/40 bg-panel p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
            1
          </span>
          <p className="text-xs font-semibold tracking-wide text-primary">
            選擇計畫
          </p>
        </div>
        <label
          className="text-base font-semibold text-foreground"
          htmlFor="adjustment-plan-select"
        >
          要調整哪一個訓練計畫？
        </label>
        <p className="mt-1 text-sm text-muted">
          對話、近期建議與新版草稿都只會套用到目前選擇的計畫。
        </p>
        <select
          className="mt-3 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          id="adjustment-plan-select"
          onChange={(event) => onSelectPlan(event.target.value)}
          value={selectedPlan.id}
        >
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.title} / {plan.activeVersionLabel}
            </option>
          ))}
        </select>

        <div className="mt-4 grid gap-3 text-sm text-muted md:grid-cols-3">
          <div className="rounded-md border border-line bg-background p-3">
            <p className="text-xs font-semibold">目標</p>
            <p className="mt-1">{selectedPlan.goalLabel}</p>
          </div>
          <div className="rounded-md border border-line bg-background p-3">
            <p className="text-xs font-semibold">期間</p>
            <p className="mt-1">
              {selectedPlan.startDate || "未提供"} -{" "}
              {selectedPlan.endDate || "未提供"}
            </p>
          </div>
          <div className="rounded-md border border-line bg-background p-3">
            <p className="text-xs font-semibold">目前版本</p>
            <p className="mt-1">{selectedPlan.activeVersionLabel}</p>
          </div>
        </div>
      </section>

      <PlanAdjustmentPanel
        activeVersionLabel={`${selectedPlan.title} / ${selectedPlan.activeVersionLabel}`}
        currentDraft={selectedPlan.currentDraft}
        feedback={selectedPlan.feedback}
        initialConversation={selectedPlan.initialConversation}
        key={selectedPlan.id}
        planId={selectedPlan.id}
        sourceFeedbackId={
          selectedPlan.id === initialPlanId ? sourceFeedbackId : undefined
        }
      />
    </div>
  );
}
