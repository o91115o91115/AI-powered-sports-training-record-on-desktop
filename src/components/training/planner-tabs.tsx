"use client";

import type { ReactNode } from "react";
import { useState } from "react";

type PlannerTab = "plans" | "chat";

type PlannerTabsProps = {
  chatContent: ReactNode;
  planContent: ReactNode;
};

const tabs: Array<{ id: PlannerTab; label: string }> = [
  { id: "plans", label: "查看計畫" },
  { id: "chat", label: "AI 對話建立計畫" }
];

export function PlannerTabs({
  chatContent,
  planContent
}: PlannerTabsProps) {
  const [activeTab, setActiveTab] = useState<PlannerTab>("plans");
  const content = {
    chat: chatContent,
    plans: planContent
  }[activeTab];

  return (
    <div>
      <div
        aria-label="訓練計畫功能"
        className="flex gap-2 overflow-x-auto border-b border-line"
        role="tablist"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              aria-controls={`planner-panel-${tab.id}`}
              aria-selected={isActive}
              className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
              id={`planner-tab-${tab.id}`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              type="button"
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        aria-labelledby={`planner-tab-${activeTab}`}
        className="pt-6"
        id={`planner-panel-${activeTab}`}
        role="tabpanel"
      >
        {content}
      </div>
    </div>
  );
}
