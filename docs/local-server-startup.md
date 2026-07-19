# 本機 Server 啟動步驟

本文說明如何在本機啟動 AI 運動訓練與飲食紀錄系統。

## 1. 進入專案資料夾

開啟 PowerShell 或 Windows Terminal，進入專案根目錄：

```powershell
cd "C:\Users\User\Desktop\SFDC_Project\AI-powered sports training record on desktop"
```

## 2. 第一次啟動前準備

第一次拿到專案，或 `node_modules` 不存在時，先安裝套件：

```powershell
pnpm install
```

這個指令會依照 `package.json` 安裝 Next.js、React、Prisma、OpenAI SDK、Tailwind 等專案套件。

## 3. 設定環境變數

專案已提供 `.env.local`。

若要啟用 OpenAI API，請在 `.env.local` 補上：

```env
OPENAI_API_KEY="你的 OpenAI API Key"
OPENAI_MODEL="gpt-4.1-mini"
DATABASE_URL="file:./dev.db"
DATABASE_BACKUP_DIR="./data/backups"
DATABASE_BACKUP_RETENTION="7"
```

注意：

1. 不要把真實 API key 提交到 Git。
2. 沒有 API key 時，首頁與一般頁面仍可啟動，但 AI API 功能會無法使用。
3. `DATABASE_BACKUP_DIR` 可使用相對或絕對路徑；正式 Server 必須指向持久化磁碟。

安裝套件後，先建立或升級資料庫並驗證：

```powershell
pnpm db:deploy
pnpm db:verify
```

## 4. 啟動開發 Server

平常啟動本機網站只需要執行：

```powershell
pnpm dev
```

看到類似以下訊息代表啟動成功：

```text
Next.js 15.x.x
- Local: http://localhost:3000
Ready
```

## 5. 開啟網站

server 啟動後，用瀏覽器開啟：

```text
http://localhost:3000
```

或：

```text
http://127.0.0.1:3000
```

也可以測試 health API：

```text
http://127.0.0.1:3000/api/health
```

正常會回傳：

```json
{ "ok": true, "service": "ai-powered-sports-training-record-on-desktop" }
```

## 6. 停止 Server

在執行 `pnpm dev` 的終端機視窗按：

```text
Ctrl + C
```

看到終端機回到可輸入指令的狀態，就代表 server 已停止。

## 7. 什麼時候需要重跑指令

| 情境                      | 指令                                                              |
| ------------------------- | ----------------------------------------------------------------- |
| 第一次啟動專案            | `pnpm install`、`pnpm db:deploy`、`pnpm db:verify`，再 `pnpm dev` |
| 平常開發或查看畫面        | `pnpm dev`                                                        |
| `package.json` 套件有變更 | `pnpm install`                                                    |
| 刪除過 `node_modules`     | `pnpm install`                                                    |
| 拉到新的 migration        | `pnpm db:backup`，再 `pnpm db:deploy` 與 `pnpm db:verify`         |

## 8. Prisma 注意事項

目前資料庫已建立 Prisma migration baseline。一般環境使用：

```powershell
pnpm db:status
pnpm db:deploy
pnpm db:verify
```

`db:deploy` 已處理部分 Windows 環境無法由 Prisma 自行建立空白 SQLite 檔案的情況。不要改回直接執行 migration SQL 的初始化方式。

禁止對含有正式資料的資料庫執行：

```text
prisma migrate reset
prisma db push
```

## 9. 資料庫備份

建立一致性備份：

```powershell
pnpm db:backup
```

本機未設定 `DATABASE_BACKUP_DIR` 時，預設使用專案下的 `data/backups`，且該目錄不會提交到 Git。正式 Server 必須設定絕對路徑並掛載到持久化磁碟。

備份會同時產生：

- SQLite `.db` 快照
- `.backup-manifest.json`
- SHA-256
- 資料表筆數、完整性與外鍵檢查結果

詳細復原方式請參考 `docs/phase1/第二批資料庫安全.md`。

## 10. Windows PowerShell 注意事項

若 PowerShell 直接執行 `npm` 被 Execution Policy 擋住，專案仍建議使用：

```powershell
pnpm dev
```

若需要執行 npm，可改用：

```powershell
npm.cmd --version
```

## 11. 若 localhost 無法開啟

請依序檢查：

1. `pnpm dev` 的終端機視窗是否仍開著。
2. 終端機是否顯示 `Ready`。
3. 是否有其他程式占用 `3000` port。
4. 改開 `http://127.0.0.1:3000`。
5. 關閉 server 後重新執行 `pnpm dev`。
