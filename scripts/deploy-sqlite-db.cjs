const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const {
  PRISMA_SCHEMA_PATH,
  PROJECT_ROOT,
  getDatabasePath,
  loadProjectEnv,
  toSqliteUrl
} = require("./sqlite-database-utils.cjs");

function main() {
  loadProjectEnv();

  const databasePath = getDatabasePath();
  const databaseUrl = toSqliteUrl(databasePath);
  const prismaCliPath = path.join(
    PROJECT_ROOT,
    "node_modules",
    "prisma",
    "build",
    "index.js"
  );

  fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  if (!fs.existsSync(databasePath)) {
    // Prisma schema engine 在部分 Windows 環境無法建立不存在的 SQLite 檔案。
    fs.closeSync(fs.openSync(databasePath, "wx"));
    console.log(`Created empty SQLite file: ${databasePath}`);
  }

  const result = spawnSync(
    process.execPath,
    [prismaCliPath, "migrate", "deploy", "--schema", PRISMA_SCHEMA_PATH],
    {
      cwd: PROJECT_ROOT,
      encoding: "utf8",
      env: { ...process.env, DATABASE_URL: databaseUrl },
      shell: false
    }
  );

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.status !== 0) {
    throw new Error(
      "Prisma migrate deploy 失敗；資料庫檔案已保留，請先檢查錯誤，不要執行 reset。"
    );
  }
}

try {
  main();
} catch (error) {
  console.error(`Database deployment failed: ${error.message}`);
  process.exitCode = 1;
}
