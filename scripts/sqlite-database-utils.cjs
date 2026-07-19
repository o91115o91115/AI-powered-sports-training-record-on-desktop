const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const { PrismaClient } = require("@prisma/client");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const PRISMA_SCHEMA_PATH = path.join(PROJECT_ROOT, "prisma", "schema.prisma");
const MIGRATIONS_DIR = path.join(PROJECT_ROOT, "prisma", "migrations");

const REQUIRED_TABLES = [
  "AiFeedback",
  "FoodLog",
  "NutritionSuggestion",
  "PlanAdjustment",
  "TrainingDay",
  "TrainingGoal",
  "TrainingPlan",
  "TrainingPlanConversation",
  "TrainingPlanConversationMessage",
  "TrainingPlanVersion",
  "UserProfile",
  "WorkoutLog"
];

const SPORT_CATEGORIES = [
  "running",
  "swimming",
  "cycling",
  "strength_training"
];

function loadProjectEnv() {
  for (const fileName of [".env.local", ".env"]) {
    const envPath = path.join(PROJECT_ROOT, fileName);

    if (!fs.existsSync(envPath)) continue;

    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);

      if (!match || process.env[match[1]]) continue;

      process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
    }
  }
}

function getDatabasePath(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl?.startsWith("file:")) {
    throw new Error("DATABASE_URL 必須是 SQLite file: 路徑。");
  }

  const filePath = decodeURIComponent(
    databaseUrl.slice("file:".length).split("?")[0]
  );

  if (!filePath) {
    throw new Error("DATABASE_URL 缺少 SQLite 檔案路徑。");
  }

  return path.isAbsolute(filePath)
    ? path.normalize(filePath)
    : path.resolve(path.dirname(PRISMA_SCHEMA_PATH), filePath);
}

function getBackupConfig() {
  const configuredDirectory = process.env.DATABASE_BACKUP_DIR?.trim();

  if (process.env.NODE_ENV === "production" && !configuredDirectory) {
    throw new Error(
      "正式環境必須設定 DATABASE_BACKUP_DIR，且應指向持久化磁碟。"
    );
  }

  const directory = path.resolve(
    PROJECT_ROOT,
    configuredDirectory || "./data/backups"
  );
  const retentionText = process.env.DATABASE_BACKUP_RETENTION?.trim() || "7";
  const retention = Number.parseInt(retentionText, 10);

  if (!Number.isInteger(retention) || retention < 1 || retention > 100) {
    throw new Error("DATABASE_BACKUP_RETENTION 必須是 1 到 100 的整數。");
  }

  return { directory, retention };
}

function toSqliteUrl(databasePath) {
  return `file:${path.resolve(databasePath).replace(/\\/g, "/")}`;
}

function createPrismaClient(databasePath) {
  return new PrismaClient({ datasourceUrl: toSqliteUrl(databasePath) });
}

function quoteIdentifier(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function quoteSqliteString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function serializeValue(value) {
  if (typeof value === "bigint") return Number(value);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serializeValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        serializeValue(nested)
      ])
    );
  }
  return value;
}

function getMigrationNames() {
  return fs
    .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function getMigrationChecksums() {
  return Object.fromEntries(
    getMigrationNames().map((migrationName) => [
      migrationName,
      getFileSha256(path.join(MIGRATIONS_DIR, migrationName, "migration.sql"))
    ])
  );
}

async function getCount(prisma, sql) {
  const rows = await prisma.$queryRawUnsafe(sql);
  return Number(rows[0]?.count ?? 0);
}

async function inspectDatabase(databasePath) {
  if (!fs.existsSync(databasePath)) {
    throw new Error(`找不到資料庫：${databasePath}`);
  }

  const prisma = createPrismaClient(databasePath);

  try {
    const integrityRows = serializeValue(
      await prisma.$queryRawUnsafe("PRAGMA integrity_check")
    );
    const foreignKeyViolations = serializeValue(
      await prisma.$queryRawUnsafe("PRAGMA foreign_key_check")
    );
    const tableRows = serializeValue(
      await prisma.$queryRawUnsafe(
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
      )
    );
    const tables = tableRows.map((row) => row.name);
    const tableCounts = {};

    for (const table of tables.filter((name) => !name.startsWith("sqlite_"))) {
      tableCounts[table] = await getCount(
        prisma,
        `SELECT COUNT(*) AS count FROM ${quoteIdentifier(table)}`
      );
    }

    const migrationHistory = tables.includes("_prisma_migrations")
      ? serializeValue(
          await prisma.$queryRawUnsafe(
            'SELECT migration_name, checksum, finished_at, rolled_back_at, applied_steps_count FROM "_prisma_migrations" ORDER BY migration_name'
          )
        )
      : [];
    const validCategories = SPORT_CATEGORIES.map(quoteSqliteString).join(", ");
    const invalidTrainingDayCategories = tables.includes("TrainingDay")
      ? await getCount(
          prisma,
          `SELECT COUNT(*) AS count FROM "TrainingDay" WHERE "sportCategory" IS NOT NULL AND "sportCategory" NOT IN (${validCategories})`
        )
      : 0;
    const invalidWorkoutLogCategories = tables.includes("WorkoutLog")
      ? await getCount(
          prisma,
          `SELECT COUNT(*) AS count FROM "WorkoutLog" WHERE "sportCategory" IS NOT NULL AND "sportCategory" NOT IN (${validCategories})`
        )
      : 0;
    const unclassifiedTrainingDays = tables.includes("TrainingDay")
      ? await getCount(
          prisma,
          'SELECT COUNT(*) AS count FROM "TrainingDay" WHERE "trainingType" <> \'rest\' AND "sportCategory" IS NULL'
        )
      : 0;
    const unclassifiedWorkoutLogs = tables.includes("WorkoutLog")
      ? await getCount(
          prisma,
          'SELECT COUNT(*) AS count FROM "WorkoutLog" WHERE "completionStatus" <> \'rest\' AND "sportCategory" IS NULL'
        )
      : 0;
    const orphanActiveVersions = tables.includes("TrainingPlan")
      ? await getCount(
          prisma,
          'SELECT COUNT(*) AS count FROM "TrainingPlan" AS plan WHERE plan."activeVersionId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "TrainingPlanVersion" AS version WHERE version."id" = plan."activeVersionId" AND version."trainingPlanId" = plan."id")'
        )
      : 0;
    const orphanConversationPlans = tables.includes("TrainingPlanConversation")
      ? await getCount(
          prisma,
          'SELECT COUNT(*) AS count FROM "TrainingPlanConversation" AS conversation WHERE conversation."trainingPlanId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "TrainingPlan" AS plan WHERE plan."id" = conversation."trainingPlanId")'
        )
      : 0;

    return {
      databasePath: path.resolve(databasePath),
      fileSizeBytes: fs.statSync(databasePath).size,
      integrityRows,
      foreignKeyViolations,
      tables,
      tableCounts,
      migrationHistory,
      migrationNames: getMigrationNames(),
      migrationChecksums: getMigrationChecksums(),
      invalidTrainingDayCategories,
      invalidWorkoutLogCategories,
      unclassifiedTrainingDays,
      unclassifiedWorkoutLogs,
      orphanActiveVersions,
      orphanConversationPlans
    };
  } finally {
    await prisma.$disconnect();
  }
}

function validateInspection(inspection) {
  const errors = [];
  const warnings = [];
  const integrityMessages = inspection.integrityRows.map(
    (row) => row.integrity_check
  );

  if (integrityMessages.length !== 1 || integrityMessages[0] !== "ok") {
    errors.push(`SQLite integrity_check 失敗：${integrityMessages.join("、")}`);
  }
  if (inspection.foreignKeyViolations.length > 0) {
    errors.push(`發現 ${inspection.foreignKeyViolations.length} 筆外鍵違規。`);
  }

  const missingTables = REQUIRED_TABLES.filter(
    (table) => !inspection.tables.includes(table)
  );
  if (missingTables.length > 0) {
    errors.push(`缺少必要資料表：${missingTables.join("、")}`);
  }
  if (!inspection.tables.includes("_prisma_migrations")) {
    errors.push("缺少 _prisma_migrations，migration baseline 尚未完成。");
  }

  const appliedMigrations = inspection.migrationHistory
    .filter((migration) => migration.finished_at && !migration.rolled_back_at)
    .map((migration) => migration.migration_name)
    .sort();
  const missingMigrations = inspection.migrationNames.filter(
    (migration) => !appliedMigrations.includes(migration)
  );
  const unknownMigrations = appliedMigrations.filter(
    (migration) => !inspection.migrationNames.includes(migration)
  );

  if (missingMigrations.length > 0) {
    errors.push(`未套用 migration：${missingMigrations.join("、")}`);
  }
  if (unknownMigrations.length > 0) {
    errors.push(`資料庫含未知 migration：${unknownMigrations.join("、")}`);
  }

  const checksumMismatches = inspection.migrationHistory
    .filter(
      (migration) =>
        inspection.migrationChecksums[migration.migration_name] &&
        migration.checksum !==
          inspection.migrationChecksums[migration.migration_name]
    )
    .map((migration) => migration.migration_name);
  if (checksumMismatches.length > 0) {
    errors.push(
      `Migration checksum 不一致，既有 SQL 可能被修改：${checksumMismatches.join("、")}`
    );
  }
  if (
    inspection.invalidTrainingDayCategories > 0 ||
    inspection.invalidWorkoutLogCategories > 0
  ) {
    errors.push("sportCategory 含非標準代碼。");
  }
  if (inspection.orphanActiveVersions > 0) {
    errors.push(
      `發現 ${inspection.orphanActiveVersions} 筆無效 activeVersionId。`
    );
  }
  if (inspection.orphanConversationPlans > 0) {
    errors.push(
      `發現 ${inspection.orphanConversationPlans} 筆無效對話計畫關聯。`
    );
  }
  if (inspection.unclassifiedTrainingDays > 0) {
    warnings.push(
      `${inspection.unclassifiedTrainingDays} 筆非休息計畫日仍待確認運動分類。`
    );
  }
  if (inspection.unclassifiedWorkoutLogs > 0) {
    warnings.push(
      `${inspection.unclassifiedWorkoutLogs} 筆實際紀錄仍待確認運動分類。`
    );
  }

  return { errors, warnings };
}

function getFileSha256(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function getTimestamp() {
  return new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 17);
}

module.exports = {
  MIGRATIONS_DIR,
  PRISMA_SCHEMA_PATH,
  PROJECT_ROOT,
  createPrismaClient,
  getBackupConfig,
  getDatabasePath,
  getFileSha256,
  getTimestamp,
  inspectDatabase,
  loadProjectEnv,
  quoteSqliteString,
  serializeValue,
  toSqliteUrl,
  validateInspection
};
