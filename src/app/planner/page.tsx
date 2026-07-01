import { PageShell } from "@/components/layout/page-shell";

export default function PlannerPage() {
  return (
    <PageShell
      eyebrow="OpenAI"
      title="AI 規劃"
      description="此頁後續會串接 Planning Agent，產生訓練計畫草稿、每日營養建議與安全提醒。"
    />
  );
}
