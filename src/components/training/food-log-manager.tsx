"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  deleteFoodLog,
  type CalendarActionResult
} from "@/app/calendar/actions";
import { FoodLogForm } from "@/components/training/food-log-form";
import { mealTypes, type FoodLogFormValues } from "@/schemas/forms/food-log";

export type FoodLogManagerItem = {
  id: string;
  trainingDayId: string | null;
  workoutLogId: string | null;
  logDate: string;
  rawInput: string;
  mealType: string | null;
  foodItemsJson: string | null;
  estimatedCarbsG: number | null;
  estimatedProteinG: number | null;
  estimatedCalories: number | null;
  estimateNote: string | null;
  isFromCurrentTrainingDay: boolean;
};

type FoodLogManagerProps = {
  allowCreate?: boolean;
  canReport: boolean;
  dateLabel: string;
  foodLogs: FoodLogManagerItem[];
  createInitialValues: FoodLogFormValues;
  highlightedFoodLogIds?: string[];
};

const mealTypeLabels: Record<string, string> = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
  pre_workout: "訓練前",
  post_workout: "訓練後",
  fuel: "補給",
  snack: "點心",
  other: "其他"
};

const toNumberText = (value: number | null | undefined) =>
  value === null || value === undefined ? "" : String(value);

const toMealType = (
  value: string | null | undefined
): FoodLogFormValues["mealType"] =>
  mealTypes.includes(value as FoodLogFormValues["mealType"])
    ? (value as FoodLogFormValues["mealType"])
    : "other";

const parseFoodItems = (foodItemsJson: string | null) => {
  if (!foodItemsJson) {
    return [];
  }

  try {
    const parsed = JSON.parse(foodItemsJson);
    return Array.isArray(parsed)
      ? parsed.filter(
          (item): item is string =>
            typeof item === "string" && item.trim() !== ""
        )
      : [];
  } catch {
    return [];
  }
};

const toFoodLogValues = (
  foodLog: FoodLogManagerItem,
  baseValues: FoodLogFormValues
): FoodLogFormValues => {
  const foodItems = parseFoodItems(foodLog.foodItemsJson);

  return {
    ...baseValues,
    foodLogId: foodLog.id,
    trainingDayId: foodLog.trainingDayId ?? baseValues.trainingDayId,
    workoutLogId: foodLog.workoutLogId ?? baseValues.workoutLogId,
    logDate: foodLog.logDate,
    mealType: toMealType(foodLog.mealType),
    rawInput: foodItems.length > 0 ? foodItems.join("、") : foodLog.rawInput,
    estimatedCarbsG: toNumberText(foodLog.estimatedCarbsG),
    estimatedProteinG: toNumberText(foodLog.estimatedProteinG),
    estimatedCalories: toNumberText(foodLog.estimatedCalories),
    estimateNote: foodLog.estimateNote ?? ""
  };
};

function FoodLogCard({
  canReport,
  foodLog,
  isNewlyCreated,
  isDeleting,
  onDelete,
  onEdit
}: {
  canReport: boolean;
  foodLog: FoodLogManagerItem;
  isNewlyCreated: boolean;
  isDeleting: boolean;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const foodItems = parseFoodItems(foodLog.foodItemsJson);
  const displayText =
    foodItems.length > 0 ? foodItems.join("、") : foodLog.rawInput;

  return (
    <article
      className={`rounded-md border p-3 ${
        isNewlyCreated
          ? "border-primary bg-primary/10"
          : "border-line bg-background"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-panel px-2 py-1 text-xs font-semibold text-muted">
              {foodLog.mealType
                ? (mealTypeLabels[foodLog.mealType] ?? foodLog.mealType)
                : "未分類"}
            </span>
            <span className="text-xs text-muted">{foodLog.logDate}</span>
            {isNewlyCreated ? (
              <span className="rounded-md bg-primary px-2 py-1 text-xs font-semibold text-white">
                本次新增
              </span>
            ) : null}
            {!foodLog.isFromCurrentTrainingDay ? (
              <span className="rounded-md bg-accent/10 px-2 py-1 text-xs font-semibold text-accent">
                建立於舊版計畫
              </span>
            ) : null}
          </div>
          <p className="mt-3 text-sm leading-6 text-foreground">
            {displayText}
          </p>
        </div>
        {canReport ? (
          <div className="flex shrink-0 gap-2">
            <button
              className="inline-flex items-center gap-1 rounded-md border border-line bg-panel px-3 py-2 text-xs font-semibold text-foreground transition hover:border-primary"
              onClick={onEdit}
              type="button"
            >
              <Pencil size={14} />
              編輯
            </button>
            <button
              className="inline-flex items-center gap-1 rounded-md border border-line bg-panel px-3 py-2 text-xs font-semibold text-danger transition hover:border-danger disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isDeleting}
              onClick={onDelete}
              type="button"
            >
              <Trash2 size={14} />
              {isDeleting ? "刪除中" : "刪除"}
            </button>
          </div>
        ) : null}
      </div>
      <div className="mt-3 grid gap-2 text-sm text-muted md:grid-cols-3">
        <p>碳水：{foodLog.estimatedCarbsG ?? "未估算"} g</p>
        <p>蛋白質：{foodLog.estimatedProteinG ?? "未估算"} g</p>
        <p>熱量：{foodLog.estimatedCalories ?? "未估算"} kcal</p>
      </div>
      {foodLog.estimateNote ? (
        <p className="mt-2 text-xs leading-5 text-muted">
          {foodLog.estimateNote}
        </p>
      ) : null}
    </article>
  );
}

export function FoodLogManager({
  allowCreate = true,
  canReport,
  dateLabel,
  foodLogs,
  createInitialValues,
  highlightedFoodLogIds = []
}: FoodLogManagerProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [result, setResult] = useState<CalendarActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const highlightedFoodLogIdSet = new Set(highlightedFoodLogIds);

  const handleDelete = (foodLogId: string) => {
    const confirmed = window.confirm("確定要刪除這筆飲食紀錄嗎？");

    if (!confirmed) {
      return;
    }

    setResult(null);
    setDeletingId(foodLogId);
    startTransition(async () => {
      const response = await deleteFoodLog({
        foodLogId,
        userProfileId: createInitialValues.userProfileId
      });
      setResult(response);
      setDeletingId(null);

      if (response.ok) {
        if (editingId === foodLogId) {
          setEditingId(null);
        }
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-line bg-panel p-4">
        <h3 className="font-semibold text-foreground">實際飲食紀錄</h3>
        {foodLogs.length === 0 ? (
          <p className="mt-2 text-sm leading-6 text-muted">
            尚未記錄這一天的實際飲食。
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {foodLogs.map((foodLog) =>
              editingId === foodLog.id ? (
                <FoodLogForm
                  canReport={canReport}
                  dateLabel={dateLabel}
                  initialValues={toFoodLogValues(foodLog, createInitialValues)}
                  key={foodLog.id}
                  mode="edit"
                  onCancel={() => setEditingId(null)}
                  onSaved={() => setEditingId(null)}
                />
              ) : (
                <FoodLogCard
                  canReport={canReport}
                  foodLog={foodLog}
                  isDeleting={isPending && deletingId === foodLog.id}
                  isNewlyCreated={highlightedFoodLogIdSet.has(foodLog.id)}
                  key={foodLog.id}
                  onDelete={() => handleDelete(foodLog.id)}
                  onEdit={() => setEditingId(foodLog.id)}
                />
              )
            )}
          </div>
        )}
        {result ? (
          <p
            className={`mt-3 text-sm ${result.ok ? "text-primary" : "text-danger"}`}
          >
            {result.message}
          </p>
        ) : null}
      </div>

      {canReport && allowCreate ? (
        <FoodLogForm
          canReport={canReport}
          dateLabel={dateLabel}
          initialValues={createInitialValues}
        />
      ) : null}
    </div>
  );
}
