import { getAdjustablePlansData } from "@/app/adjustments/data";
import { PageShell } from "@/components/layout/page-shell";
import { PlanAdjustmentSelector } from "@/components/training/plan-adjustment-selector";

type AdjustmentsPageProps = {
  searchParams: Promise<{
    feedbackId?: string;
    planId?: string;
  }>;
};

export default async function AdjustmentsPage({ searchParams }: AdjustmentsPageProps) {
  const { feedbackId, planId } = await searchParams;
  const plans = await getAdjustablePlansData(feedbackId);

  return (
    <PageShell
      description="先透過對話釐清調整方向，確認後才產生明天起的新版草稿。"
      eyebrow="計畫調整"
      title="訓練計畫調整"
    >
      <PlanAdjustmentSelector
        initialPlanId={planId}
        plans={plans}
        sourceFeedbackId={feedbackId}
        syncSelectionToUrl
      />
    </PageShell>
  );
}
