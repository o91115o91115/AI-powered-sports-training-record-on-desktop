const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const {
  PRISMA_SCHEMA_PATH,
  PROJECT_ROOT,
  inspectDatabase,
  loadProjectEnv,
  toSqliteUrl,
  validateInspection
} = require("./sqlite-database-utils.cjs");

function runPrisma(args, databaseUrl) {
  const prismaCliPath = path.join(
    PROJECT_ROOT,
    "node_modules",
    "prisma",
    "build",
    "index.js"
  );
  const result = spawnSync(process.execPath, [prismaCliPath, ...args], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    env: { ...process.env, DATABASE_URL: databaseUrl },
    shell: false
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new Error(`Prisma 指令失敗：prisma ${args.join(" ")}`);
  }
}

async function main() {
  loadProjectEnv();

  const temporaryRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "ai-training-migration-")
  );
  const databasePath = path.join(temporaryRoot, "clean.db");
  const databaseUrl = toSqliteUrl(databasePath);

  try {
    // 與正式部署工具一致，先建立空檔以相容部分 Windows schema engine。
    fs.closeSync(fs.openSync(databasePath, "wx"));
    runPrisma(
      ["migrate", "deploy", "--schema", PRISMA_SCHEMA_PATH],
      databaseUrl
    );

    const inspection = await inspectDatabase(databasePath);
    const { errors, warnings } = validateInspection(inspection);

    if (warnings.length > 0) {
      for (const warning of warnings) console.warn(`Warning: ${warning}`);
    }
    if (errors.length > 0) {
      throw new Error(errors.join(" "));
    }

    runPrisma(
      [
        "migrate",
        "diff",
        "--from-url",
        databaseUrl,
        "--to-schema-datamodel",
        PRISMA_SCHEMA_PATH,
        "--exit-code"
      ],
      databaseUrl
    );

    console.log(`Clean migration tables: ${inspection.tables.join(", ")}`);
    console.log("Clean database migration verification passed.");
  } finally {
    const resolvedTemporaryRoot = path.resolve(temporaryRoot);
    const resolvedSystemTemp = path.resolve(os.tmpdir());

    if (
      resolvedTemporaryRoot.startsWith(
        `${resolvedSystemTemp}${path.sep}ai-training-migration-`
      )
    ) {
      fs.rmSync(resolvedTemporaryRoot, { recursive: true, force: true });
    }
  }
}

main().catch((error) => {
  console.error(`Clean migration verification failed: ${error.message}`);
  process.exitCode = 1;
});
