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
                <NutritionSuggestionPanel
                  nutritionSuggestion={day.nutritionSuggestion}
                  trainingType={day.trainingType}
                />
              )}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
