import { TrainingDayForm } from "@/components/forms/training-day-form";
import { NutritionSuggestionPanel } from "@/components/training/nutrition-suggestion-panel";
import {
  emptyTrainingDayValues,
  type TrainingDayFormValues
} from "@/schemas/forms/training-plan";

export type TrainingDayListItem = {
  id: string;
  date: string;
  trainingType: string;
  targetDistanceKm: number | null;
  targetDurationMin: number | null;
  targetPace: string | null;
  targetIntensity: string | null;
  description: string | null;
  notes: string | null;
  recoverySuggestion: string | null;
  nutritionSuggestion: {
    carbSuggestion: string | null;
    proteinSuggestion: string | null;
    hydrationSuggestion: string | null;
    preWorkoutSuggestion: string | null;
    postWorkoutSuggestion: string | null;
    longRunFuelSuggestion: string | null;
    restDaySuggestion: string | null;
    estimateNote: string | null;
  } | null;
};

type TrainingDayListProps = {
  canEdit: boolean;
  trainingDays: TrainingDayListItem[];
  trainingPlanVersionId: string;
};

const toText = (value: string | null | undefined) => value ?? "";
const toNumberText = (value: number | null | undefined) =>
  value === null || value === undefined ? "" : String(value);

const toFormValues = (
  trainingPlanVersionId: string,
  day?: TrainingDayListItem
): TrainingDayFormValues => {
  if (!day) {
    return {
      ...emptyTrainingDayValues,
      trainingPlanVersionId
    };
  }

  return {
    trainingDayId: day.id,
    trainingPlanVersionId,
    date: day.date,
    trainingType: day.trainingType,
    targetDistanceKm: toNumberText(day.targetDistanceKm),
    targetDurationMin: toNumberText(day.targetDurationMin),
    targetPace: toText(day.targetPace),
    targetIntensity: toText(day.targetIntensity),
    description: toText(day.description),
    notes: toText(day.notes),
    recoverySuggestion: toText(day.recoverySuggestion),
    carbSuggestion: toText(day.nutritionSuggestion?.carbSuggestion),
    proteinSuggestion: toText(day.nutritionSuggestion?.proteinSuggestion),
    hydrationSuggestion: toText(day.nutritionSuggestion?.hydrationSuggestion),
    preWorkoutSuggestion: toText(day.nutritionSuggestion?.preWorkoutSuggestion),
    postWorkoutSuggestion: toText(day.nutritionSuggestion?.postWorkoutSuggestion),
    longRunFuelSuggestion: toText(day.nutritionSuggestion?.longRunFuelSuggestion),
    restDaySuggestion: toText(day.nutritionSuggestion?.restDaySuggestion),
    estimateNote: toText(day.nutritionSuggestion?.estimateNote)
  };
};

const trainingTypeLabels: Record<string, string> = {
  cross_training: "交叉訓練",
  easy: "輕鬆跑",
  interval: "間歇",
  long_run: "長跑",
  race: "比賽",
  rest: "休息",
  tempo: "節奏跑"
};

const valueOrEmpty = (value: string | number | null | undefined) =>
  value === null || value === undefined || String(value).trim() === ""
    ? "未提供"
    : String(value);

function TrainingDaySummary({ day }: { day: TrainingDayListItem }) {
  return (
    <section className="rounded-lg border border-line bg-panel p-4">
      <div className="flex flex-col gap-3 border-b border-line pb-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-accent">{day.date}</p>
          <h5 className="mt-1 text-lg font-semibold text-foreground">
            {trainingTypeLabels[day.trainingType] ?? day.trainingType}
          </h5>
        </div>
        <span className="w-fit rounded-md bg-background px-3 py-2 text-xs font-semibold text-muted">
          訓練規劃
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-md border border-line bg-background p-3">
          <p className="text-xs font-semibold text-muted">目標距離</p>
          <p className="mt-2 text-sm text-foreground">
            {day.targetDistanceKm ? `${day.targetDistanceKm} km` : "未提供"}
          </p>
        </div>
        <div className="rounded-md border border-line bg-background p-3">
          <p className="text-xs font-semibold text-muted">目標時間</p>
          <p className="mt-2 text-sm text-foreground">
            {day.targetDurationMin ? `${day.targetDurationMin} 分鐘` : "未提供"}
          </p>
        </div>
        <div className="rounded-md border border-line bg-background p-3">
          <p className="text-xs font-semibold text-muted">目標配速</p>
          <p className="mt-2 text-sm text-foreground">{valueOrEmpty(day.targetPace)}</p>
        </div>
        <div className="rounded-md border border-line bg-background p-3">
          <p className="text-xs font-semibold text-muted">強度</p>
          <p className="mt-2 text-sm text-foreground">{valueOrEmpty(day.targetIntensity)}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-md border border-line bg-background p-3">
          <p className="text-xs font-semibold text-muted">訓練內容</p>
          <p className="mt-2 text-sm leading-6 text-foreground">
            {valueOrEmpty(day.description)}
          </p>
        </div>
        <div className="rounded-md border border-line bg-background p-3">
          <p className="text-xs font-semibold text-muted">恢復建議</p>
          <p className="mt-2 text-sm leading-6 text-foreground">
            {valueOrEmpty(day.recoverySuggestion)}
          </p>
        </div>
      </div>

      {day.notes ? (
        <p className="mt-4 rounded-md border border-line bg-background p-3 text-sm leading-6 text-muted">
          {day.notes}
        </p>
      ) : null}
    </section>
  );
}

export function TrainingDayList({
  canEdit,
  trainingDays,
  trainingPlanVersionId
}: TrainingDayListProps) {
  return (
    <section className="mt-5 rounded-lg border border-line bg-background p-4">
      <div className="border-b border-line pb-4">
        <h4 className="font-semibold text-foreground">每日訓練與營養建議</h4>
        <p className="mt-1 text-sm text-muted">
          已確認版本不可直接編輯；若要調整正式計畫，請建立新版本。
        </p>
      </div>

      {canEdit ? (
        <div className="mt-4">
          <TrainingDayForm
            canEdit={canEdit}
            initialValues={toFormValues(trainingPlanVersionId)}
            mode="create"
          />
        </div>
      ) : null}

      <div className="mt-4">
        {trainingDays.length === 0 ? (
          <p className="rounded-md border border-line bg-panel p-4 text-sm text-muted">
            尚未建立每日訓練內容。
          </p>
        ) : (
          trainingDays.map((day) => (
            <article className="mt-4 space-y-4" key={day.id}>
              {canEdit ? (
                <TrainingDayForm
                  canEdit={canEdit}
                  initialValues={toFormValues(trainingPlanVersionId, day)}
                  mode="edit"
                />
              ) : (
                <>
                  <TrainingDaySummary day={day} />
                  <NutritionSuggestionPanel
                    nutritionSuggestion={day.nutritionSuggestion}
                    trainingType={day.trainingType}
                  />
                </>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
