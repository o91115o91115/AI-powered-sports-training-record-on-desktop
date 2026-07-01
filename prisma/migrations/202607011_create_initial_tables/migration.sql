PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "UserProfile" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "age" INTEGER,
  "gender" TEXT,
  "heightCm" REAL,
  "weightKg" REAL,
  "dietaryRestrictions" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "TrainingGoal" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userProfileId" TEXT NOT NULL,
  "raceName" TEXT,
  "targetDistance" TEXT NOT NULL,
  "raceDate" DATETIME,
  "targetFinishTime" TEXT,
  "goalType" TEXT,
  "currentWeeklyMileageKm" REAL,
  "recentFiveKTime" TEXT,
  "recentTenKTime" TEXT,
  "recentHalfMarathonTime" TEXT,
  "hasMarathonExperience" BOOLEAN NOT NULL DEFAULT false,
  "weeklyTrainingDays" INTEGER,
  "preferredTrainingDays" TEXT,
  "unavailableDates" TEXT,
  "injuryNote" TEXT,
  "fatigueLevel" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainingGoal_userProfileId_fkey"
    FOREIGN KEY ("userProfileId") REFERENCES "UserProfile" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "TrainingPlan" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userProfileId" TEXT NOT NULL,
  "trainingGoalId" TEXT,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "startDate" DATETIME,
  "endDate" DATETIME,
  "activeVersionId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainingPlan_userProfileId_fkey"
    FOREIGN KEY ("userProfileId") REFERENCES "UserProfile" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TrainingPlan_trainingGoalId_fkey"
    FOREIGN KEY ("trainingGoalId") REFERENCES "TrainingGoal" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "TrainingPlanVersion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "trainingPlanId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "summary" TEXT,
  "aiModel" TEXT,
  "promptSnapshot" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmedAt" DATETIME,
  CONSTRAINT "TrainingPlanVersion_trainingPlanId_fkey"
    FOREIGN KEY ("trainingPlanId") REFERENCES "TrainingPlan" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "TrainingDay" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "trainingPlanVersionId" TEXT NOT NULL,
  "date" DATETIME NOT NULL,
  "trainingType" TEXT NOT NULL,
  "targetDistanceKm" REAL,
  "targetDurationMin" INTEGER,
  "targetPace" TEXT,
  "targetIntensity" TEXT,
  "description" TEXT,
  "notes" TEXT,
  "recoverySuggestion" TEXT,
  "completionStatus" TEXT NOT NULL DEFAULT 'planned',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainingDay_trainingPlanVersionId_fkey"
    FOREIGN KEY ("trainingPlanVersionId") REFERENCES "TrainingPlanVersion" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "NutritionSuggestion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "trainingDayId" TEXT NOT NULL,
  "carbSuggestion" TEXT,
  "proteinSuggestion" TEXT,
  "hydrationSuggestion" TEXT,
  "preWorkoutSuggestion" TEXT,
  "postWorkoutSuggestion" TEXT,
  "longRunFuelSuggestion" TEXT,
  "restDaySuggestion" TEXT,
  "estimateNote" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NutritionSuggestion_trainingDayId_fkey"
    FOREIGN KEY ("trainingDayId") REFERENCES "TrainingDay" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "WorkoutLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userProfileId" TEXT NOT NULL,
  "trainingDayId" TEXT,
  "logDate" DATETIME NOT NULL,
  "rawInput" TEXT NOT NULL,
  "workoutType" TEXT,
  "distanceKm" REAL,
  "durationMin" INTEGER,
  "pace" TEXT,
  "heartRateAvg" INTEGER,
  "fatigueScore" INTEGER,
  "painLocation" TEXT,
  "painScore" INTEGER,
  "completionStatus" TEXT,
  "parsedByModel" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkoutLog_userProfileId_fkey"
    FOREIGN KEY ("userProfileId") REFERENCES "UserProfile" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "WorkoutLog_trainingDayId_fkey"
    FOREIGN KEY ("trainingDayId") REFERENCES "TrainingDay" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "FoodLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userProfileId" TEXT NOT NULL,
  "trainingDayId" TEXT,
  "workoutLogId" TEXT,
  "logDate" DATETIME NOT NULL,
  "rawInput" TEXT NOT NULL,
  "mealType" TEXT,
  "foodItemsJson" TEXT,
  "estimatedCarbsG" REAL,
  "estimatedProteinG" REAL,
  "estimatedCalories" REAL,
  "estimateNote" TEXT,
  "parsedByModel" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FoodLog_userProfileId_fkey"
    FOREIGN KEY ("userProfileId") REFERENCES "UserProfile" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "FoodLog_trainingDayId_fkey"
    FOREIGN KEY ("trainingDayId") REFERENCES "TrainingDay" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "FoodLog_workoutLogId_fkey"
    FOREIGN KEY ("workoutLogId") REFERENCES "WorkoutLog" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "PlanAdjustment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "trainingPlanVersionId" TEXT NOT NULL,
  "newTrainingPlanVersionId" TEXT,
  "reasonType" TEXT NOT NULL,
  "reasonDescription" TEXT,
  "affectedDates" TEXT,
  "beforeSummary" TEXT,
  "afterSummary" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "aiModel" TEXT,
  "promptSnapshot" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmedAt" DATETIME,
  CONSTRAINT "PlanAdjustment_trainingPlanVersionId_fkey"
    FOREIGN KEY ("trainingPlanVersionId") REFERENCES "TrainingPlanVersion" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PlanAdjustment_newTrainingPlanVersionId_fkey"
    FOREIGN KEY ("newTrainingPlanVersionId") REFERENCES "TrainingPlanVersion" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "AiFeedback" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userProfileId" TEXT NOT NULL,
  "workoutLogId" TEXT,
  "foodLogId" TEXT,
  "planAdjustmentId" TEXT,
  "feedbackType" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "trainingAnalysis" TEXT,
  "nutritionAnalysis" TEXT,
  "riskWarning" TEXT,
  "nextStepSuggestion" TEXT,
  "shouldReplan" BOOLEAN NOT NULL DEFAULT false,
  "aiModel" TEXT,
  "promptSnapshot" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiFeedback_userProfileId_fkey"
    FOREIGN KEY ("userProfileId") REFERENCES "UserProfile" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AiFeedback_workoutLogId_fkey"
    FOREIGN KEY ("workoutLogId") REFERENCES "WorkoutLog" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AiFeedback_foodLogId_fkey"
    FOREIGN KEY ("foodLogId") REFERENCES "FoodLog" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AiFeedback_planAdjustmentId_fkey"
    FOREIGN KEY ("planAdjustmentId") REFERENCES "PlanAdjustment" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "TrainingPlanVersion_trainingPlanId_versionNumber_key"
  ON "TrainingPlanVersion" ("trainingPlanId", "versionNumber");

CREATE INDEX IF NOT EXISTS "TrainingDay_trainingPlanVersionId_date_idx"
  ON "TrainingDay" ("trainingPlanVersionId", "date");

CREATE UNIQUE INDEX IF NOT EXISTS "NutritionSuggestion_trainingDayId_key"
  ON "NutritionSuggestion" ("trainingDayId");

CREATE INDEX IF NOT EXISTS "WorkoutLog_userProfileId_logDate_idx"
  ON "WorkoutLog" ("userProfileId", "logDate");

CREATE INDEX IF NOT EXISTS "FoodLog_userProfileId_logDate_idx"
  ON "FoodLog" ("userProfileId", "logDate");

CREATE INDEX IF NOT EXISTS "AiFeedback_userProfileId_createdAt_idx"
  ON "AiFeedback" ("userProfileId", "createdAt");
