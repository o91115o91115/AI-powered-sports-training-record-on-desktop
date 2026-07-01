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
```

注意：

1. 不要把真實 API key 提交到 Git。
2. 沒有 API key 時，首頁與一般頁面仍可啟動，但 AI API 功能會無法使用。

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
{"ok":true,"service":"ai-powered-sports-training-record-on-desktop"}
```

## 6. 停止 Server

在執行 `pnpm dev` 的終端機視窗按：

```text
Ctrl + C
```

看到終端機回到可輸入指令的狀態，就代表 server 已停止。

## 7. 什麼時候需要重跑指令

| 情境 | 指令 |
| --- | --- |
| 第一次啟動專案 | `pnpm install`，再 `pnpm dev` |
| 平常開發或查看畫面 | `pnpm dev` |
| `package.json` 套件有變更 | `pnpm install` |
| 刪除過 `node_modules` | `pnpm install` |
| 資料庫 schema 有變更 | `pnpm prisma:migrate` 或依當下 DB 狀態處理 |

## 8. Prisma 注意事項

目前 Prisma schema 驗證正常：

```powershell
.\node_modules\.bin\prisma.CMD validate
```

但在目前本機環境中，`prisma migrate dev` / `prisma db push` 曾出現 schema engine 空白錯誤。這不影響目前 Next.js 首頁與 API skeleton 啟動。

後續開始實作資料庫讀寫功能前，需再處理 Prisma migration 問題。

## 9. Windows PowerShell 注意事項

若 PowerShell 直接執行 `npm` 被 Execution Policy 擋住，專案仍建議使用：

```powershell
pnpm dev
```

若需要執行 npm，可改用：

```powershell
npm.cmd --version
```

## 10. 若 localhost 無法開啟

請依序檢查：

1. `pnpm dev` 的終端機視窗是否仍開著。
2. 終端機是否顯示 `Ready`。
3. 是否有其他程式占用 `3000` port。
4. 改開 `http://127.0.0.1:3000`。
5. 關閉 server 後重新執行 `pnpm dev`。
