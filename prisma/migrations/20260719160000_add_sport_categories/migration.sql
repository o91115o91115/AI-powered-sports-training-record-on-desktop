ALTER TABLE "TrainingDay"
ADD COLUMN "sportCategory" TEXT;

ALTER TABLE "WorkoutLog"
ADD COLUMN "sportCategory" TEXT;

-- 既有跑步計畫可由訓練類型明確辨識；休息日與內容有歧義的交叉訓練維持未分類。
UPDATE "TrainingDay"
SET "sportCategory" = 'running'
WHERE "trainingType" IN ('easy', 'interval', 'long_run', 'race', 'tempo');

-- 實際紀錄優先依使用者填寫的訓練類型分類。
UPDATE "WorkoutLog"
SET "sportCategory" = CASE
  WHEN LOWER(COALESCE("workoutType", '')) IN ('easy', 'interval', 'long_run', 'race', 'run', 'running', 'tempo')
    OR COALESCE("workoutType", '') LIKE '%跑%'
    THEN 'running'
  WHEN LOWER(COALESCE("workoutType", '')) IN ('swim', 'swimming')
    OR COALESCE("workoutType", '') LIKE '%游泳%'
    THEN 'swimming'
  WHEN LOWER(COALESCE("workoutType", '')) IN ('bike', 'biking', 'bicycle', 'cycle', 'cycling')
    OR COALESCE("workoutType", '') LIKE '%單車%'
    OR COALESCE("workoutType", '') LIKE '%自行車%'
    OR COALESCE("workoutType", '') LIKE '%腳踏車%'
    THEN 'cycling'
  WHEN LOWER(COALESCE("workoutType", '')) IN ('gym', 'lifting', 'resistance', 'strength', 'strength_training', 'weight', 'weights')
    OR COALESCE("workoutType", '') LIKE '%重量訓練%'
    OR COALESCE("workoutType", '') LIKE '%重訓%'
    OR COALESCE("workoutType", '') LIKE '%肌力%'
    THEN 'strength_training'
  ELSE NULL
END;

-- 無明確實際類型時，才沿用所屬計畫日已確認的分類。
UPDATE "WorkoutLog"
SET "sportCategory" = (
  SELECT "TrainingDay"."sportCategory"
  FROM "TrainingDay"
  WHERE "TrainingDay"."id" = "WorkoutLog"."trainingDayId"
)
WHERE "sportCategory" IS NULL;
