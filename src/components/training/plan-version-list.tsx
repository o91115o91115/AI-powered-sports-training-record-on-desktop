"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Archive, CheckCircle2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import {
  archiveTrainingPlan,
  archiveTrainingPlanVersion,
  confirmTrainingPlanVersion,
  createTrainingPlanVersion,
  type PlannerActionResult
} from "@/app/planner/actions";
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
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<TrainingPlanVersionFormValues>({
    defaultValues: {
      trainingPlanId: planId,
      summary: ""
    },
    resolver: zodResolver(trainingPlanVersionFormSchema)
  });

  const runAction = (action: () => Promise<PlannerActionResult>) => {
    setResult(null);
    startTransition(async () => {
      const actionResult = await action();
      setResult(actionResult);

      if (actionResult.ok) {
        router.refresh();
      }
    });
  };

  const onSubmit = (values: TrainingPlanVersionFormValues) => {
    runAction(async () => {
      const actionResult = await createTrainingPlanVersion(values);

      if (actionResult.ok) {
        reset({ trainingPlanId: planId, summary: "" });
      }

      return actionResult;
    });
  };

  return (
    <section className="rounded-lg border border-line bg-panel p-5">
      <div className="flex flex-col gap-2 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">計畫版本</h3>
          <p className="mt-1 text-sm text-muted">
            新內容先建立為草稿，確認套用後才會成為目前正式版本。
          </p>
        </div>
        {planStatus !== "archived" ? (
          <button
            className="inline-flex items-center justify-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-semibold text-muted transition hover:border-danger hover:text-danger disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            onClick={() => runAction(() => archiveTrainingPlan(planId))}
            type="button"
          >
            <Archive size={15} />
            封存計畫
          </button>
        ) : null}
      </div>

      <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={handleSubmit(onSubmit)}>
        <input type="hidden" {...register("trainingPlanId")} />
        <div className="flex-1">
          <input
            className={inputClass}
            disabled={isPending || planStatus === "archived"}
            placeholder="版本摘要，例如：初版 8 週訓練安排"
            {...register("summary")}
          />
          {errors.summary?.message ? (
            <p className="mt-1 text-xs font-medium text-danger">{errors.summary.message}</p>
          ) : null}
        </div>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending || planStatus === "archived"}
          type="submit"
        >
          <Plus size={16} />
          新增版本
        </button>
      </form>

      {result ? (
        <p className={`mt-3 text-sm font-medium ${result.ok ? "text-primary" : "text-danger"}`}>
          {result.message}
        </p>
      ) : null}

      <div className="mt-4 divide-y divide-line rounded-md border border-line">
        {versions.length === 0 ? (
          <p className="p-4 text-sm text-muted">尚未建立版本。</p>
        ) : (
          versions.map((version) => {
            const isActive = version.id === activeVersionId;

            return (
              <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center" key={version.id}>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-foreground">V{version.versionNumber}</p>
                    <span className="rounded-md bg-background px-2 py-1 text-xs font-medium text-muted">
                      {statusLabels[version.status] ?? version.status}
                    </span>
                    {isActive ? (
                      <span className="rounded-md bg-primary px-2 py-1 text-xs font-semibold text-white">
                        目前套用
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {version.summary || "未填寫版本摘要"}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    每日訓練 {version.trainingDaysCount} 筆
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-primary px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isPending || version.status === "archived"}
                    onClick={() =>
                      runAction(() => confirmTrainingPlanVersion(planId, version.id))
                    }
                    type="button"
                  >
                    <CheckCircle2 size={15} />
                    確認套用
                  </button>
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-semibold text-muted transition hover:border-danger hover:text-danger disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isPending || version.status === "archived" || isActive}
                    onClick={() => runAction(() => archiveTrainingPlanVersion(version.id))}
                    type="button"
                  >
                    <Archive size={15} />
                    封存版本
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
