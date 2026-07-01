import { PageShell } from "@/components/layout/page-shell";

export default function DashboardPage() {
  return (
    <PageShell
      eyebrow="Dashboard"
      title="今日狀態"
      description="此頁後續會顯示今日訓練、營養建議、本週完成率、跑量趨勢與 AI 風險提醒。"
    />
  );
}
