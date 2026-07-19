ALTER TABLE "TrainingPlanConversation"
ADD COLUMN "trainingPlanId" TEXT;

ALTER TABLE "TrainingPlanConversation"
ADD COLUMN "conversationType" TEXT NOT NULL DEFAULT 'planning';

CREATE INDEX "TrainingPlanConversation_trainingPlanId_conversationType_status_updatedAt_idx"
ON "TrainingPlanConversation"("trainingPlanId", "conversationType", "status", "updatedAt");
