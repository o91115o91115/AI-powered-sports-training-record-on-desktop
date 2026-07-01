import { Activity, CalendarDays, ClipboardList, MessageSquareText } from "lucide-react";
import Link from "next/link";

const modules = [
  {
    title: "Dashboard",
    description: "查看今日訓練、營養建議、本週跑量與風險提醒。",
    href: "/dashboard",
    icon: Activity
  },
  {
    title: "目標設定",
    description: "建立使用者條件、比賽目標、可訓練時間與飲食限制。",
    href: "/goals",
    icon: ClipboardList
  },
  {
    title: "AI 規劃",
    description: "透過 OpenAI API 產生訓練計畫草稿與營養建議。",
    href: "/planner",
    icon: MessageSquareText
  },
  {
    title: "訓練月曆",
    description: "以日期檢視每日訓練內容、完成狀態與版本差異。",
    href: "/calendar",
    icon: CalendarDays
  }
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <section className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
          <div>
            <p className="text-sm font-semibold text-primary">Local Web App</p>
            <h1 className="mt-2 text-3xl font-semibold text-foreground">
              AI 運動訓練與飲食紀錄系統
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-muted">
              基礎專案骨架已準備以 Next.js、Prisma、SQLite 與 OpenAI API
              建構。後續可依模組逐步實作訓練規劃、每日紀錄、AI 回饋與計畫調整。
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 py-8 md:grid-cols-2">
        {modules.map((module) => {
          const Icon = module.icon;

          return (
            <Link
              className="rounded-lg border border-line bg-panel p-5 transition hover:border-primary"
              href={module.href}
              key={module.href}
            >
              <div className="flex items-start gap-4">
                <div className="flex size-10 items-center justify-center rounded-md bg-primary text-white">
                  <Icon size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{module.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted">{module.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
