const fs = require("node:fs");
const path = require("node:path");

const {
  createPrismaClient,
  getBackupConfig,
  getDatabasePath,
  getFileSha256,
  getTimestamp,
  inspectDatabase,
  loadProjectEnv,
  quoteSqliteString
} = require("./sqlite-database-utils.cjs");

const BACKUP_PATTERN = /^ai-training-backup-\d{17}\.db$/;

function removeExpiredBackups(directory, retention) {
  const backupFiles = fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && BACKUP_PATTERN.test(entry.name))
    .map((entry) => entry.name)
    .sort()
    .reverse();
  const removed = [];

  for (const fileName of backupFiles.slice(retention)) {
    const backupPath = path.resolve(directory, fileName);
    const manifestPath = `${backupPath}.backup-manifest.json`;

    if (path.dirname(backupPath) !== path.resolve(directory)) continue;

    fs.rmSync(backupPath);
    if (fs.existsSync(manifestPath)) fs.rmSync(manifestPath);
    removed.push(fileName);
  }

  return removed;
}

async function main() {
  loadProjectEnv();

  const sourceDatabase = getDatabasePath();
  const { directory, retention } = getBackupConfig();

  if (!fs.existsSync(sourceDatabase)) {
    throw new Error(`找不到來源資料庫：${sourceDatabase}`);
  }

  fs.mkdirSync(directory, { recursive: true });

  const backupPath = path.join(
    directory,
    `ai-training-backup-${getTimestamp()}.db`
  );
  const manifestPath = `${backupPath}.backup-manifest.json`;

  if (fs.existsSync(backupPath) || fs.existsSync(manifestPath)) {
    throw new Error("同名備份已存在，已停止以避免覆寫。");
  }

  const prisma = createPrismaClient(sourceDatabase);
  try {
    // VACUUM INTO 會建立交易一致的 SQLite 快照，不直接複製可能仍在寫入的檔案。
    await prisma.$executeRawUnsafe(
      `VACUUM INTO ${quoteSqliteString(backupPath)}`
    );
  } finally {
    await prisma.$disconnect();
  }

  const inspection = await inspectDatabase(backupPath);
  const manifest = {
    manifestVersion: 1,
    createdAt: new Date().toISOString(),
    sourceDatabase: path.resolve(sourceDatabase),
    backupDatabase: path.resolve(backupPath),
    sha256: getFileSha256(backupPath),
    sizeBytes: fs.statSync(backupPath).size,
    integrityCheck: inspection.integrityRows,
    foreignKeyViolationCount: inspection.foreignKeyViolations.length,
    tableCounts: inspection.tableCounts,
    migrationHistory: inspection.migrationHistory.map((migration) => ({
      migrationName: migration.migration_name,
      checksum: migration.checksum
    }))
  };

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx"
  });

  const removed = removeExpiredBackups(directory, retention);

  console.log(`Backup database: ${backupPath}`);
  console.log(`Backup manifest: ${manifestPath}`);
  console.log(`SHA-256: ${manifest.sha256}`);
  console.log(
    `Integrity check: ${inspection.integrityRows[0]?.integrity_check}`
  );
  console.log(
    `Foreign key violations: ${inspection.foreignKeyViolations.length}`
  );
  if (removed.length > 0) {
    console.log(`Removed expired backups: ${removed.join(", ")}`);
  }
}

main().catch((error) => {
  console.error(`Database backup failed: ${error.message}`);
  process.exitCode = 1;
});
