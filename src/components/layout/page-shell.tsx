import Link from "next/link";
import type { ReactNode } from "react";

type PageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
  showHomeLink?: boolean;
};

const navigationLinks = [
  { href: "/", label: "總覽" },
  { href: "/goals", label: "目標設定" },
  { href: "/planner", label: "訓練計畫" },
  { href: "/calendar", label: "訓練月曆" },
  { href: "/adjustments", label: "計畫調整" },
  { href: "/history", label: "歷史紀錄" }
];

export function PageShell({
  eyebrow,
  title,
  description,
  children
}: PageShellProps) {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <nav className="rounded-lg border border-line bg-panel p-3">
          <div className="flex flex-wrap gap-2">
            {navigationLinks.map((item) => (
              <Link
                className="rounded-md px-3 py-2 text-sm font-semibold text-muted transition hover:bg-background hover:text-primary"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
        <section className="mt-8 rounded-lg border border-line bg-panel p-6">
          <p className="text-sm font-semibold text-accent">{eyebrow}</p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">{title}</h1>
          <p className="mt-3 max-w-3xl leading-7 text-muted">{description}</p>
        </section>
        {children ? <div className="mt-6">{children}</div> : null}
      </div>
    </main>
  );
}
