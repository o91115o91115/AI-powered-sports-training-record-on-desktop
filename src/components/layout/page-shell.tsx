import Link from "next/link";

type PageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PageShell({ eyebrow, title, description }: PageShellProps) {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <Link className="text-sm font-medium text-primary" href="/">
          回首頁
        </Link>
        <section className="mt-8 rounded-lg border border-line bg-panel p-6">
          <p className="text-sm font-semibold text-accent">{eyebrow}</p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">{title}</h1>
          <p className="mt-3 max-w-3xl leading-7 text-muted">{description}</p>
        </section>
      </div>
    </main>
  );
}
