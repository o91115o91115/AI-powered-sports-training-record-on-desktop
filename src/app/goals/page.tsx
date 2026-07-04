import { PageShell } from "@/components/layout/page-shell";
import { GoalSettingsForm } from "@/components/forms/goal-settings-form";
import { prisma } from "@/lib/prisma";
import {
  emptyGoalSettingsValues,
  type GoalSettingsFormValues
} from "@/schemas/forms/goal-settings";

const toText = (value: string | null | undefined) => value ?? "";
const toNumberText = (value: number | null | undefined) =>
  value === null || value === undefined ? "" : String(value);
const toDateInput = (value: Date | null | undefined) =>
  value ? value.toISOString().slice(0, 10) : "";

async function getInitialValues(): Promise<GoalSettingsFormValues> {
  const profile = await prisma.userProfile.findFirst({
    include: {
      trainingGoals: {
        orderBy: { updatedAt: "desc" },
        take: 1
      }
    },
    orderBy: { updatedAt: "desc" }
  });

  if (!profile) {
    return emptyGoalSettingsValues;
  }

  const goal = profile.trainingGoals[0];

  return {
    userProfileId: profile.id,
    trainingGoalId: goal?.id ?? "",
    name: profile.name,
    age: toNumberText(profile.age),
    gender: toText(profile.gender),
    heightCm: toNumberText(profile.heightCm),
    weightKg: toNumberText(profile.weightKg),
    dietaryRestrictions: toText(profile.dietaryRestrictions),
    raceName: toText(goal?.raceName),
    targetDistance: toText(goal?.targetDistance),
    raceDate: toDateInput(goal?.raceDate),
    targetFinishTime: toText(goal?.targetFinishTime),
    goalType: toText(goal?.goalType),
    currentWeeklyMileageKm: toNumberText(goal?.currentWeeklyMileageKm),
    recentFiveKTime: toText(goal?.recentFiveKTime),
    recentTenKTime: toText(goal?.recentTenKTime),
    recentHalfMarathonTime: toText(goal?.recentHalfMarathonTime),
    hasMarathonExperience: goal?.hasMarathonExperience ?? false,
    weeklyTrainingDays: toNumberText(goal?.weeklyTrainingDays),
    preferredTrainingDays: toText(goal?.preferredTrainingDays),
    unavailableDates: toText(goal?.unavailableDates),
    injuryNote: toText(goal?.injuryNote),
    fatigueLevel: toText(goal?.fatigueLevel)
  };
}

export default async function GoalsPage() {
  const initialValues = await getInitialValues();

  return (
    <PageShell
      eyebrow="Profile"
      title="目標設定"
      description="建立使用者基本資料、目前跑步能力、目標賽事、傷痛狀況與飲食限制。此階段只儲存基礎資料，不會直接產生 AI 計畫。"
    >
      <GoalSettingsForm initialValues={initialValues} />
    </PageShell>
  );
}
