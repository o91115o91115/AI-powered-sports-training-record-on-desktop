# AI 運動訓練與飲食紀錄系統

本專案是本機端 Web App，使用 Next.js、TypeScript、Prisma、SQLite 與 OpenAI API 建置。

## 開發環境

```bash
pnpm install
pnpm db:deploy
pnpm db:verify
pnpm dev
```

啟動後開啟：

```text
http://localhost:3000
```

## 環境變數

`.env.local` 已建立 placeholder。後續維護時補上：

```env
OPENAI_API_KEY="your-api-key"
OPENAI_MODEL="gpt-4.1-mini"
DATABASE_URL="file:./dev.db"
DATABASE_BACKUP_DIR="./data/backups"
DATABASE_BACKUP_RETENTION="7"
```

不要提交真實 API key。

`DATABASE_BACKUP_DIR` 可使用相對或絕對路徑。正式 Server 必須將它設為持久化磁碟，例如 Linux 的 `/var/lib/ai-training-planner/backups` 或 Docker volume 的 `/app-data/backups`。

## 資料庫安全指令

| 指令                   | 用途                                        |
| ---------------------- | ------------------------------------------- |
| `pnpm db:backup`       | 建立 SQLite 一致性備份、SHA-256 與 manifest |
| `pnpm db:verify`       | 檢查完整性、外鍵、migration 與資料分類      |
| `pnpm db:status`       | 顯示 Prisma migration 狀態                  |
| `pnpm db:deploy`       | 在新環境建立資料庫或套用已提交的 migration  |
| `pnpm db:verify-clean` | 使用暫存資料庫驗證能否從零完成 migration    |

一般初始化或 Server 部署只使用 `db:deploy`。`prisma migrate dev` 僅供開發者建立新的 migration，不可對正式資料庫執行 `migrate reset` 或 `db push`。
