import { Droplets, Utensils } from "lucide-react";

export type NutritionSuggestionPanelData = {
  carbSuggestion: string | null;
  proteinSuggestion: string | null;
  hydrationSuggestion: string | null;
  preWorkoutSuggestion: string | null;
  postWorkoutSuggestion: string | null;
  longRunFuelSuggestion: string | null;
  restDaySuggestion: string | null;
  estimateNote: string | null;
};

type NutritionSuggestionPanelProps = {
  nutritionSuggestion: NutritionSuggestionPanelData | null;
  trainingType: string;
};

const trainingTypeNotes: Record<string, string> = {
  long_run: "長跑日請優先留意水分、電解質與途中補給，避免空腹硬撐。",
  tempo: "節奏跑前可安排容易消化的碳水，訓練後補充蛋白質與水分協助恢復。",
  interval: "間歇訓練強度較高，訓練前碳水與訓練後恢復都應保守安排。",
  rest: "休息日不需要極端節食，仍應維持蛋白質與基礎水分攝取。",
  race: "比賽日飲食以熟悉、低風險、容易消化的內容為主，不臨時嘗試新食物。"
};

const fields: Array<{
  key: keyof NutritionSuggestionPanelData;
  label: string;
  emphasis?: "hydration" | "fuel";
}> = [
  { key: "carbSuggestion", label: "碳水建議", emphasis: "fuel" },
  { key: "proteinSuggestion", label: "蛋白質建議" },
  { key: "hydrationSuggestion", label: "水分補充", emphasis: "hydration" },
  { key: "preWorkoutSuggestion", label: "訓練前飲食" },
  { key: "postWorkoutSuggestion", label: "訓練後恢復" },
  { key: "longRunFuelSuggestion", label: "長跑補給" },
  { key: "restDaySuggestion", label: "休息日飲食" }
];

const valueOrEmpty = (value: string | null | undefined) => value?.trim() || "尚未提供";

export function NutritionSuggestionPanel({
  nutritionSuggestion,
  trainingType
}: NutritionSuggestionPanelProps) {
  const typeNote =
    trainingTypeNotes[trainingType] ??
    "依照當日訓練量調整飲食方向，避免過度限制熱量或臨時嘗試高風險飲食。";

  return (
    <section className="rounded-lg border border-line bg-panel p-4">
      <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary text-white">
              <Utensils size={16} />
            </div>
            <h5 className="font-semibold text-foreground">每日營養建議</h5>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted">{typeNote}</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-md bg-background px-3 py-2 text-xs font-medium text-muted">
          <Droplets size={14} />
          方向性估算
        </div>
      </div>

      {!nutritionSuggestion ? (
        <p className="mt-4 rounded-md border border-line bg-background p-3 text-sm text-muted">
          尚未建立營養建議。
        </p>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {fields.map((field) => (
            <div className="rounded-md border border-line bg-background p-3" key={field.key}>
              <p className="text-xs font-semibold text-muted">{field.label}</p>
              <p className="mt-2 text-sm leading-6 text-foreground">
                {valueOrEmpty(nutritionSuggestion[field.key])}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 rounded-md border border-line bg-background p-3">
        <p className="text-xs font-semibold text-muted">估算說明</p>
        <p className="mt-2 text-sm leading-6 text-foreground">
          {valueOrEmpty(nutritionSuggestion?.estimateNote)}
        </p>
        <p className="mt-2 text-xs leading-5 text-muted">
          此內容為訓練搭配與飲食方向參考，不取代醫療、營養師或其他專業建議；若有疾病、特殊飲食限制或嚴重不適，請尋求專業協助。
        </p>
      </div>
    </section>
  );
}
