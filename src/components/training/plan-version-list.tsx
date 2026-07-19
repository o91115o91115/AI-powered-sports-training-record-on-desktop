"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Archive, CheckCircle2, ChevronDown, Loader2, Plus, RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import {
  archiveTrainingPlan,
  archiveTrainingPlanVersion,
  confirmTrainingPlanVersion,
  createTrainingPlanVersion,
  getTrainingPlanVersionDetails,
  type PlannerActionResult
} from "@/app/planner/actions";
import {
  TrainingDayList,
  type TrainingDayListItem
} from "@/components/training/training-day-list";
import {
  type TrainingPlanVersionFormValues,
  trainingPlanVersionFormSchema
} from "@/schemas/forms/training-plan";

export type VersionListItem = {
  id: string;
  versionNumber: number;
  status: string;
  summary: string | null;
  trainingDaysCount: number;
};

type PlanVersionListProps = {
  activeVersionId: string | null;
  planId: string;
  planStatus: string;
  versions: VersionListItem[];
};

const statusLabels: Record<string, string> = {
  draft: "草稿",
  confirmed: "已確認",
  rejected: "已拒絕",
  archived: "已封存"
};

const inputClass =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

export function PlanVersionList({
  activeVersionId,
  planId,
  planStatus,
  versions
}: PlanVersionListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<PlannerActionResult | null>(null);
  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null);
  const [loadingVersionId, setLoadingVersionId] = useState<string | null>(null);
  const [versionErrors, setVersionErrors] = useState<Record<string, string>>({});
  const [versionDetails, setVersionDetails] = useState<
    Record<string, TrainingDayListItem[]>
  >({});
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<TrainingPlanVersionFormValues>({
    defaultValues: { trainingPlanId: planId, summary: "" },
    resolver: zodResolver(trainingPlanVersionFormSchema)
  });

  const runAction = (action: () => Promise<PlannerActionResult>) => {
    setResult(null);
    startTransition(async () => {
      const actionResult = await action();
      setResult(actionResult);
      if (actionResult.ok) router.refresh();
    });
  };

  const loadVersion = async (versionId: string, force = false) => {
    if (!force && versionDetails[versionId]) return;

    setLoadingVersionId(versionId);
    setVersionErrors((current) => ({ ...current, [versionId]: "" }));
    const actionResult = await getTrainingPlanVersionDetails(versionId);

    if (actionResult.ok) {
      setVersionDetails((current) => ({
        ...current,
        [versionId]: actionResult.trainingDays
      }));
    } else {
      setVersionErrors((current) => ({
        ...current,
        [versionId]: actionResult.message
      }));
    }
    setLoadingVersionId(null);
  };

  const toggleVersion = (versionId: string) => {
    if (expandedVersionId === versionId) {
      setExpandedVersionId(null);
      return;
    }

    setExpandedVersionId(versionId);
    void loadVersion(versionId);
  };

  const onSubmit = (values: TrainingPlanVersionFormValues) => {
    runAction(async () => {
      const actionResult = await createTrainingPlanVersion(values);
      if (actionResult.ok) reset({ trainingPlanId: planId, summary: "" });
      return actionResult;
    });
  };

  return (
    <section className="rounded-lg border border-line bg-panel p-5">
      <div className="flex flex-col gap-2 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">計畫版本</h3>
          <p className="mt-1 text-sm text-muted">
            點擊版本後才載入每日訓練內容，減少頁面首次載入時間。
          </p>
        </div>
        {planStatus !== "archived" ? (
          <button
            className="inline-flex items-center justify-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-semibold text-muted transition hover:border-danger hover:text-danger disabled:opacity-60"
            disabled={isPending}
            onClick={() => runAction(() => archiveTrainingPlan(planId))}
            type="button"
          >
            <Archive size={15} /> 封存計畫
          </button>
        ) : null}
      </div>

      <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={handleSubmit(onSubmit)}>
        <input type="hidden" {...register("trainingPlanId")} />
        <div className="flex-1">
          <input
            className={inputClass}
            disabled={isPending || planStatus === "archived"}
            placeholder="版本摘要，例如：第 8 週恢復調整"
            {...register("summary")}
          />
          {errors.summary?.message ? (
            <p className="mt-1 text-xs font-medium text-danger">{errors.summary.message}</p>
          ) : null}
        </div>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60"
          disabled={isPending || planStatus === "archived"}
          type="submit"
        >
          <Plus size={16} /> 新增版本
        </button>
      </form>

      {result ? (
        <p className={`mt-3 text-sm font-medium ${result.ok ? "text-primary" : "text-danger"}`}>
          {result.message}
        </p>
      ) : null}

      <div className="mt-4 divide-y divide-line rounded-md border border-line">
        {versions.length === 0 ? (
          <p className="p-4 text-sm text-muted">目前尚無計畫版本。</p>
        ) : (
          versions.map((version) => {
            const isActive = version.id === activeVersionId;
            const isExpanded = version.id === expandedVersionId;
            const isLoading = version.id === loadingVersionId;
            const details = versionDetails[version.id];
            const detailError = versionErrors[version.id];

            return (
              <article key={version.id}>
                <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
                  <button
                    aria-expanded={isExpanded}
                    className="flex flex-1 items-center gap-3 text-left"
                    onClick={() => toggleVersion(version.id)}
                    type="button"
                  >
                    <ChevronDown
                      className={`shrink-0 transition ${isExpanded ? "rotate-180" : ""}`}
                      size={18}
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground">V{version.versionNumber}</p>
                        <span className="rounded-md bg-background px-2 py-1 text-xs font-medium text-muted">
                          {statusLabels[version.status] ?? version.status}
                        </span>
                        {isActive ? (
                          <span className="rounded-md bg-primary px-2 py-1 text-xs font-semibold text-white">
                            目前使用
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted">
                        {version.summary || "尚未填寫版本摘要"}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        每日訓練 {version.trainingDaysCount} 筆
                      </p>
                    </div>
                  </button>

                  <div className="flex flex-wrap gap-2">
                    <button
                      className="inline-flex items-center gap-2 rounded-md border border-primary px-3 py-2 text-sm font-semibold text-primary hover:bg-primary hover:text-white disabled:opacity-60"
                      disabled={isPending || version.status === "archived"}
                      onClick={() => runAction(() => confirmTrainingPlanVersion(planId, version.id))}
                      type="button"
                    >
                      <CheckCircle2 size={15} /> 設為目前版本
                    </button>
                    <button
                      className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-semibold text-muted hover:border-danger hover:text-danger disabled:opacity-60"
                      disabled={isPending || version.status === "archived" || isActive}
                      onClick={() => runAction(() => archiveTrainingPlanVersion(version.id))}
                      type="button"
                    >
                      <Archive size={15} /> 封存版本
                    </button>
                  </div>
                </div>

                {isExpanded ? (
                  <div className="border-t border-line bg-background p-4">
                    {isLoading ? (
                      <p className="flex items-center gap-2 text-sm text-muted">
                        <Loader2 className="animate-spin" size={16} /> 正在載入版本內容…
                      </p>
                    ) : null}
                    {detailError && !isLoading ? (
                      <div className="rounded-md border border-danger bg-danger/10 p-3 text-sm text-danger">
                        <p>{detailError}</p>
                        <button
                          className="mt-2 inline-flex items-center gap-2 font-semibold"
                          onClick={() => void loadVersion(version.id, true)}
                          type="button"
                        >
                          <RotateCw size={14} /> 重新載入
                        </button>
                      </div>
                    ) : null}
                    {details && !isLoading ? (
                      <TrainingDayList
                        canEdit={version.status === "draft" && planStatus !== "archived"}
                        trainingDays={details}
                        trainingPlanVersionId={version.id}
                      />
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
