const path = require("node:path");

const {
  getDatabasePath,
  inspectDatabase,
  loadProjectEnv,
  validateInspection
} = require("./sqlite-database-utils.cjs");

function getRequestedDatabasePath() {
  const argumentIndex = process.argv.indexOf("--database");

  if (argumentIndex === -1) return getDatabasePath();

  const value = process.argv[argumentIndex + 1];
  if (!value) throw new Error("--database 必須提供資料庫路徑。");
  return path.resolve(value);
}

async function main() {
  loadProjectEnv();

  const inspection = await inspectDatabase(getRequestedDatabasePath());
  const { errors, warnings } = validateInspection(inspection);

  console.log(`Database: ${inspection.databasePath}`);
  console.log(`Size: ${inspection.fileSizeBytes} bytes`);
  console.log(
    `Integrity check: ${inspection.integrityRows[0]?.integrity_check}`
  );
  console.log(
    `Foreign key violations: ${inspection.foreignKeyViolations.length}`
  );
  console.log(
    `Migrations: ${inspection.migrationHistory.length}/${inspection.migrationNames.length}`
  );
  console.log(`Tables: ${inspection.tables.join(", ")}`);
  console.log(`Table counts: ${JSON.stringify(inspection.tableCounts)}`);

  for (const warning of warnings) console.warn(`Warning: ${warning}`);

  if (errors.length > 0) {
    for (const error of errors) console.error(`Error: ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log("Database verification passed.");
}

main().catch((error) => {
  console.error(`Database verification failed: ${error.message}`);
  process.exitCode = 1;
});
