import { PageShell } from "@/components/layout/page-shell";

export default function LogsPage() {
  return (
    <PageShell
      eyebrow="Daily Log"
      title="每日紀錄"
      description="此頁後續會讓使用者用自然語言輸入運動與飲食紀錄，並交由 Logging Agent 整理。"
    />
  );
}
