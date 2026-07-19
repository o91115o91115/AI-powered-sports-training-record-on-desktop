# 技術架構與套件規劃

## 1. 專案定位

本專案為「AI 運動訓練與飲食紀錄系統」的本機端 Web App。

使用者在本機啟動服務後，透過瀏覽器開啟系統，完成以下流程：

1. 建立使用者基本資料與訓練目標。
2. 透過 OpenAI API 產生個人化訓練與營養計畫。
3. 每日輸入運動與飲食紀錄。
4. 由 AI 整理自然語言紀錄並產生回饋。
5. 根據疲勞、傷痛、缺課或目標變更重新調整訓練計畫。
6. 透過 Dashboard、月曆與歷史紀錄追蹤訓練狀態。

## 2. 技術架構

本專案採用單一 Next.js 專案，包含 React 頁面、Server Actions、少量 Route Handlers、資料庫存取與 AI 溝通邏輯。

頁面資料主要由 Server Component 直接透過 Prisma 讀取；寫入操作集中於各功能的 Server Actions。計畫調整另以 `data.ts` 整理目前計畫、對話、草稿與差異資料，避免頁面元件直接組裝複雜查詢結果。

```text
Browser
  |
  | HTTP
  v
Next.js App
  |-- React UI
  |-- API Routes / Server Actions
  |-- AI Service
  |-- Prisma ORM
  v
SQLite Database

AI Service
  |
  | HTTPS
  v
OpenAI API
```

## 3. 開發工具

| 工具 | 用途 |
| --- | --- |
| Node.js LTS | JavaScript / TypeScript 執行環境 |
| pnpm | 套件管理與 script 執行 |
| Git | 版本控管 |
| VS Code | 開發環境 |
| SQLite | 本機資料庫 |
| DB Browser for SQLite / SQLite Viewer | 檢視本機資料庫內容 |
| Chrome / Edge | 開發與測試瀏覽器 |

## 4. 核心框架

| 技術 | 用途 | 選用原因 |
| --- | --- | --- |
| Next.js | Web App 框架 | 同時支援前端頁面與後端 API，適合本機全端應用 |
| React | UI 建置 | 適合建立互動式 Dashboard、表單、月曆與對話介面 |
| TypeScript | 型別系統 | 降低資料結構與 API 串接錯誤 |
| SQLite | 本機資料庫 | 不需額外安裝資料庫服務，適合本機端產品 |
| Prisma | ORM | 提供資料模型、migration 與型別安全查詢 |

目前主要版本為 Next.js 15、React 19、TypeScript 5、Prisma 6 與 Tailwind CSS 3，實際版本以 `package.json` 為準。

## 5. AI 功能

本專案 AI 功能統一透過 OpenAI API 與 LLM 溝通。

### 5.1 AI 使用場景

| Agent | 用途 |
| --- | --- |
| Planning Agent | 根據使用者目標與身體狀況產生訓練與營養計畫 |
| Logging Agent | 將自然語言運動與飲食紀錄整理為結構化資料 |
| Review Agent | 比對原定計畫與實際紀錄，產生分析與回饋 |
| Replanning Agent | 根據近期紀錄重新調整後續訓練菜單 |
| Conversation Agent | 蒐集規劃所需資訊，判斷資料完整度與風險後再交由 Planning Agent 產生草稿 |

### 5.2 OpenAI API 套件

```bash
pnpm add openai
```

### 5.3 API Key 管理

OpenAI API Key 只能存在後端環境變數，不可暴露在瀏覽器端。

建議使用 `.env.local`：

```env
OPENAI_API_KEY="your-api-key"
OPENAI_MODEL="gpt-4.1-mini"
```

`OPENAI_MODEL` 應設計為可設定值，方便後續切換模型。

### 5.4 AI Service 分層

AI service 建立於後端，UI 元件不直接呼叫 OpenAI SDK。多數功能透過 Server Actions 執行；每日 AI 紀錄另提供 Route Handler。

```text
UI Component
  -> Next.js API Route / Server Action
    -> AI Service
      -> OpenAI API
```

目前 AI 相關目錄：

```text
src/
  app/
    api/
      ai/
        log/
  services/
    ai/
      openai-client.ts
      conversation-agent.ts
      planning-agent.ts
      logging-agent.ts
      review-agent.ts
      replanning-agent.ts
```

### 5.5 AI 輸出格式

AI 回傳內容應優先要求 JSON 格式，後端再進行 schema 驗證後寫入資料庫。

建議搭配 `zod` 定義輸出 schema：

```bash
pnpm add zod
```

基本原則：

1. AI 產生的訓練計畫需先建立草稿，使用者確認後才正式套用。
2. AI 解析自然語言紀錄時，不可把不確定資訊當成精準結果。
3. 營養數值需標示為估算。
4. 傷痛與疾病相關內容不得作為醫療診斷。
5. 重新調整計畫時，不可覆蓋原始版本，需建立新版本。

## 6. 前端套件

| 套件 | 用途 |
| --- | --- |
| tailwindcss | UI 樣式 |
| lucide-react | Icon |
| react-hook-form | 表單狀態管理 |
| zod | 表單與 AI JSON schema 驗證 |
| @hookform/resolvers | react-hook-form 與 zod 整合 |
| date-fns | 日期處理 |
| recharts | Dashboard 圖表 |
| @fullcalendar/react | 訓練月曆 |
| @fullcalendar/daygrid | 月曆月檢視 |
| @fullcalendar/interaction | 月曆互動 |
| @tanstack/react-query | 前端 API 查詢快取 |
| zustand | 輕量狀態管理 |

套件版本與完整清單以 `package.json` 及 `pnpm-lock.yaml` 為準。

## 7. 後端與資料庫套件

| 套件 | 用途 |
| --- | --- |
| prisma | migration、schema 管理 |
| @prisma/client | 應用程式查詢資料庫 |
| openai | 呼叫 OpenAI API |

目前使用 Prisma 6 與 OpenAI Node SDK 4。

## 8. 開發與測試套件

| 套件 | 用途 |
| --- | --- |
| eslint | 靜態檢查 |
| prettier | 程式碼格式化 |
| vitest | 單元測試 |
| playwright | 端對端測試與瀏覽器畫面驗證 |

目前已設定 ESLint、Prettier、Vitest 與 Playwright。Vitest 已涵蓋訓練日期判斷、疑似重複運動紀錄、計畫調整對話正規化及每日 AI 紀錄 schema；Playwright 提供端對端測試環境。

## 9. 專案目錄

```text
src/
  app/
    dashboard/
    goals/
    planner/
    calendar/
    logs/
    adjustments/
      actions.ts
      data.ts
    history/
    api/
  components/
    dashboard/
    forms/
    layout/
    training/
  lib/
    plan-adjustment-conversation.ts
    prisma.ts
    training-date.ts
    env.ts
    utils.ts
    workout-duplicate.ts
  services/
    ai/
  schemas/
    ai/
    forms/
  types/
prisma/
  schema.prisma
  migrations/
docs/
```

## 10. 執行指令

首次安裝：

```bash
pnpm install
pnpm prisma:migrate
```

啟動本機服務：

```bash
pnpm dev
```

瀏覽器開啟：

```text
http://localhost:3000
```

## 11. 維護注意事項

1. OpenAI API Key 不可提交到 Git。
2. AI prompt、輸出 schema 與資料庫欄位需同步維護。
3. AI 產生的內容需經後端驗證後才可寫入資料庫。
4. 訓練計畫重新調整時，只能建立新版本，不應直接覆蓋舊版本。
5. 飲食營養數值預設為估算，畫面上需明確標示。
6. 傷痛、胸悶、頭暈、呼吸異常等高風險輸入應觸發保守建議。
7. 規劃對話需先通過 Zod schema 驗證並確認 readiness；資料不足時應繼續詢問，高風險時應優先顯示安全提醒。
