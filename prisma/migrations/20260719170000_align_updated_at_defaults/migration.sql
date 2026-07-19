-- 早期 migration 為 updatedAt 加入資料庫預設值，但 Prisma @updatedAt 由應用程式維護。
-- 重新定義相關資料表，使從零部署的結構與 schema.prisma 一致。
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_FoodLog" (
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
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "FoodLog_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "FoodLog_trainingDayId_fkey" FOREIGN KEY ("trainingDayId") REFERENCES "TrainingDay" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "FoodLog_workoutLogId_fkey" FOREIGN KEY ("workoutLogId") REFERENCES "WorkoutLog" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_FoodLog" (
  "createdAt", "estimateNote", "estimatedCalories", "estimatedCarbsG",
  "estimatedProteinG", "foodItemsJson", "id", "logDate", "mealType",
  "parsedByModel", "rawInput", "trainingDayId", "updatedAt",
  "userProfileId", "workoutLogId"
)
SELECT
  "createdAt", "estimateNote", "estimatedCalories", "estimatedCarbsG",
  "estimatedProteinG", "foodItemsJson", "id", "logDate", "mealType",
  "parsedByModel", "rawInput", "trainingDayId", "updatedAt",
  "userProfileId", "workoutLogId"
FROM "FoodLog";
DROP TABLE "FoodLog";
ALTER TABLE "new_FoodLog" RENAME TO "FoodLog";
CREATE INDEX "FoodLog_userProfileId_logDate_idx" ON "FoodLog"("userProfileId", "logDate");

CREATE TABLE "new_NutritionSuggestion" (
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
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "NutritionSuggestion_trainingDayId_fkey" FOREIGN KEY ("trainingDayId") REFERENCES "TrainingDay" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_NutritionSuggestion" (
  "carbSuggestion", "createdAt", "estimateNote", "hydrationSuggestion", "id",
  "longRunFuelSuggestion", "postWorkoutSuggestion", "preWorkoutSuggestion",
  "proteinSuggestion", "restDaySuggestion", "trainingDayId", "updatedAt"
)
SELECT
  "carbSuggestion", "createdAt", "estimateNote", "hydrationSuggestion", "id",
  "longRunFuelSuggestion", "postWorkoutSuggestion", "preWorkoutSuggestion",
  "proteinSuggestion", "restDaySuggestion", "trainingDayId", "updatedAt"
FROM "NutritionSuggestion";
DROP TABLE "NutritionSuggestion";
ALTER TABLE "new_NutritionSuggestion" RENAME TO "NutritionSuggestion";
CREATE UNIQUE INDEX "NutritionSuggestion_trainingDayId_key" ON "NutritionSuggestion"("trainingDayId");

CREATE TABLE "new_TrainingDay" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "trainingPlanVersionId" TEXT NOT NULL,
  "date" DATETIME NOT NULL,
  "sportCategory" TEXT,
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
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "TrainingDay_trainingPlanVersionId_fkey" FOREIGN KEY ("trainingPlanVersionId") REFERENCES "TrainingPlanVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TrainingDay" (
  "completionStatus", "createdAt", "date", "description", "id", "notes",
  "recoverySuggestion", "sportCategory", "targetDistanceKm",
  "targetDurationMin", "targetIntensity", "targetPace",
  "trainingPlanVersionId", "trainingType", "updatedAt"
)
SELECT
  "completionStatus", "createdAt", "date", "description", "id", "notes",
  "recoverySuggestion", "sportCategory", "targetDistanceKm",
  "targetDurationMin", "targetIntensity", "targetPace",
  "trainingPlanVersionId", "trainingType", "updatedAt"
FROM "TrainingDay";
DROP TABLE "TrainingDay";
ALTER TABLE "new_TrainingDay" RENAME TO "TrainingDay";
CREATE INDEX "TrainingDay_trainingPlanVersionId_date_idx" ON "TrainingDay"("trainingPlanVersionId", "date");

CREATE TABLE "new_TrainingGoal" (
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
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "TrainingGoal_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TrainingGoal" (
  "createdAt", "currentWeeklyMileageKm", "fatigueLevel", "goalType",
  "hasMarathonExperience", "id", "injuryNote", "preferredTrainingDays",
  "raceDate", "raceName", "recentFiveKTime", "recentHalfMarathonTime",
  "recentTenKTime", "targetDistance", "targetFinishTime", "unavailableDates",
  "updatedAt", "userProfileId", "weeklyTrainingDays"
)
SELECT
  "createdAt", "currentWeeklyMileageKm", "fatigueLevel", "goalType",
  "hasMarathonExperience", "id", "injuryNote", "preferredTrainingDays",
  "raceDate", "raceName", "recentFiveKTime", "recentHalfMarathonTime",
  "recentTenKTime", "targetDistance", "targetFinishTime", "unavailableDates",
  "updatedAt", "userProfileId", "weeklyTrainingDays"
FROM "TrainingGoal";
DROP TABLE "TrainingGoal";
ALTER TABLE "new_TrainingGoal" RENAME TO "TrainingGoal";

CREATE TABLE "new_TrainingPlan" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userProfileId" TEXT NOT NULL,
  "trainingGoalId" TEXT,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "startDate" DATETIME,
  "endDate" DATETIME,
  "activeVersionId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "TrainingPlan_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TrainingPlan_trainingGoalId_fkey" FOREIGN KEY ("trainingGoalId") REFERENCES "TrainingGoal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TrainingPlan" (
  "activeVersionId", "createdAt", "endDate", "id", "startDate", "status",
  "title", "trainingGoalId", "updatedAt", "userProfileId"
)
SELECT
  "activeVersionId", "createdAt", "endDate", "id", "startDate", "status",
  "title", "trainingGoalId", "updatedAt", "userProfileId"
FROM "TrainingPlan";
DROP TABLE "TrainingPlan";
ALTER TABLE "new_TrainingPlan" RENAME TO "TrainingPlan";

CREATE TABLE "new_TrainingPlanConversation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userProfileId" TEXT NOT NULL,
  "trainingGoalId" TEXT,
  "trainingPlanId" TEXT,
  "conversationType" TEXT NOT NULL DEFAULT 'planning',
  "generatedTrainingPlanVersionId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "summary" TEXT,
  "readiness" TEXT NOT NULL DEFAULT 'needs_more_info',
  "riskLevel" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "TrainingPlanConversation_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TrainingPlanConversation_trainingGoalId_fkey" FOREIGN KEY ("trainingGoalId") REFERENCES "TrainingGoal" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "TrainingPlanConversation_generatedTrainingPlanVersionId_fkey" FOREIGN KEY ("generatedTrainingPlanVersionId") REFERENCES "TrainingPlanVersion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TrainingPlanConversation" (
  "conversationType", "createdAt", "generatedTrainingPlanVersionId", "id",
  "readiness", "riskLevel", "status", "summary", "trainingGoalId",
  "trainingPlanId", "updatedAt", "userProfileId"
)
SELECT
  "conversationType", "createdAt", "generatedTrainingPlanVersionId", "id",
  "readiness", "riskLevel", "status", "summary", "trainingGoalId",
  "trainingPlanId", "updatedAt", "userProfileId"
FROM "TrainingPlanConversation";
DROP TABLE "TrainingPlanConversation";
ALTER TABLE "new_TrainingPlanConversation" RENAME TO "TrainingPlanConversation";
CREATE UNIQUE INDEX "TrainingPlanConversation_generatedTrainingPlanVersionId_key" ON "TrainingPlanConversation"("generatedTrainingPlanVersionId");
CREATE INDEX "TrainingPlanConversation_userProfileId_status_updatedAt_idx" ON "TrainingPlanConversation"("userProfileId", "status", "updatedAt");
CREATE INDEX "TrainingPlanConversation_trainingGoalId_status_idx" ON "TrainingPlanConversation"("trainingGoalId", "status");
CREATE INDEX "TrainingPlanConversation_trainingPlanId_conversationType_status_updatedAt_idx" ON "TrainingPlanConversation"("trainingPlanId", "conversationType", "status", "updatedAt");

CREATE TABLE "new_UserProfile" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "age" INTEGER,
  "gender" TEXT,
  "heightCm" REAL,
  "weightKg" REAL,
  "dietaryRestrictions" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_UserProfile" (
  "age", "createdAt", "dietaryRestrictions", "gender", "heightCm", "id",
  "name", "updatedAt", "weightKg"
)
SELECT
  "age", "createdAt", "dietaryRestrictions", "gender", "heightCm", "id",
  "name", "updatedAt", "weightKg"
FROM "UserProfile";
DROP TABLE "UserProfile";
ALTER TABLE "new_UserProfile" RENAME TO "UserProfile";

CREATE TABLE "new_WorkoutLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userProfileId" TEXT NOT NULL,
  "trainingDayId" TEXT,
  "logDate" DATETIME NOT NULL,
  "rawInput" TEXT NOT NULL,
  "sportCategory" TEXT,
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
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "WorkoutLog_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "WorkoutLog_trainingDayId_fkey" FOREIGN KEY ("trainingDayId") REFERENCES "TrainingDay" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_WorkoutLog" (
  "completionStatus", "createdAt", "distanceKm", "durationMin",
  "fatigueScore", "heartRateAvg", "id", "logDate", "pace",
  "painLocation", "painScore", "parsedByModel", "rawInput",
  "sportCategory", "trainingDayId", "updatedAt", "userProfileId",
  "workoutType"
)
SELECT
  "completionStatus", "createdAt", "distanceKm", "durationMin",
  "fatigueScore", "heartRateAvg", "id", "logDate", "pace",
  "painLocation", "painScore", "parsedByModel", "rawInput",
  "sportCategory", "trainingDayId", "updatedAt", "userProfileId",
  "workoutType"
FROM "WorkoutLog";
DROP TABLE "WorkoutLog";
ALTER TABLE "new_WorkoutLog" RENAME TO "WorkoutLog";
CREATE INDEX "WorkoutLog_userProfileId_logDate_idx" ON "WorkoutLog"("userProfileId", "logDate");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
