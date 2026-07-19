export type WorkoutDuplicateCandidate = {
  rawInput?: string | null;
  workoutType?: string | null;
  distanceKm?: number | null;
  durationMin?: number | null;
  pace?: string | null;
};

const normalizeText = (value?: string | null) =>
  value?.normalize("NFKC").replace(/\s+/g, "").toLocaleLowerCase() ?? "";

const hasSameText = (first?: string | null, second?: string | null) => {
  const normalizedFirst = normalizeText(first);
  const normalizedSecond = normalizeText(second);

  return Boolean(normalizedFirst && normalizedFirst === normalizedSecond);
};

const hasSameNumber = (first?: number | null, second?: number | null) =>
  first !== null &&
  first !== undefined &&
  second !== null &&
  second !== undefined &&
  Math.abs(first - second) < 0.01;

// 同日相同原文，或運動類型加上至少兩項主要數據相同時，視為疑似重複。
export const isPossibleWorkoutDuplicate = (
  candidate: WorkoutDuplicateCandidate,
  existing: WorkoutDuplicateCandidate
) => {
  if (hasSameText(candidate.rawInput, existing.rawInput)) {
    return true;
  }

  if (!hasSameText(candidate.workoutType, existing.workoutType)) {
    return false;
  }

  const sameDistance = hasSameNumber(candidate.distanceKm, existing.distanceKm);
  const sameDuration = hasSameNumber(
    candidate.durationMin,
    existing.durationMin
  );
  const samePace = hasSameText(candidate.pace, existing.pace);
  const matchingMetrics = [sameDistance, sameDuration, samePace].filter(
    Boolean
  ).length;

  return matchingMetrics >= 2;
};

export const findPossibleWorkoutDuplicate = <
  T extends WorkoutDuplicateCandidate
>(
  candidate: WorkoutDuplicateCandidate,
  existingLogs: T[]
) =>
  existingLogs.find((existing) =>
    isPossibleWorkoutDuplicate(candidate, existing)
  ) ?? null;
