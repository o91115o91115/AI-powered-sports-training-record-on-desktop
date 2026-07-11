PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "TrainingPlanConversation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userProfileId" TEXT NOT NULL,
  "trainingGoalId" TEXT,
  "generatedTrainingPlanVersionId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "summary" TEXT,
  "readiness" TEXT NOT NULL DEFAULT 'needs_more_info',
  "riskLevel" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainingPlanConversation_userProfileId_fkey"
    FOREIGN KEY ("userProfileId") REFERENCES "UserProfile" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TrainingPlanConversation_trainingGoalId_fkey"
    FOREIGN KEY ("trainingGoalId") REFERENCES "TrainingGoal" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "TrainingPlanConversation_generatedTrainingPlanVersionId_fkey"
    FOREIGN KEY ("generatedTrainingPlanVersionId") REFERENCES "TrainingPlanVersion" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "TrainingPlanConversationMessage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "conversationId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "metadataJson" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainingPlanConversationMessage_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "TrainingPlanConversation" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "TrainingPlanConversation_generatedTrainingPlanVersionId_key"
  ON "TrainingPlanConversation" ("generatedTrainingPlanVersionId");

CREATE INDEX IF NOT EXISTS "TrainingPlanConversation_userProfileId_status_updatedAt_idx"
  ON "TrainingPlanConversation" ("userProfileId", "status", "updatedAt");

CREATE INDEX IF NOT EXISTS "TrainingPlanConversation_trainingGoalId_status_idx"
  ON "TrainingPlanConversation" ("trainingGoalId", "status");

CREATE INDEX IF NOT EXISTS "TrainingPlanConversationMessage_conversationId_createdAt_idx"
  ON "TrainingPlanConversationMessage" ("conversationId", "createdAt");
