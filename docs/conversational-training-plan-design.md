# 對話式 AI 訓練課表產生調整建議

## 1. 背景與目標

目前「訓練計畫」流程是使用者先建立個人資料與訓練目標，接著在 `/planner` 頁面按下 AI 產生按鈕。系統會透過 `generateAiTrainingPlanDraft` 收集最新的 `UserProfile` 與 `TrainingGoal`，交給 `planning-agent` 產生固定格式的訓練計畫草稿，再寫入 `TrainingPlan`、`TrainingPlanVersion`、`TrainingDay` 與 `NutritionSuggestion`。

建議改為「對話式收斂需求」：使用者先在訓練計畫頁面與 LLM 對話，LLM 逐步確認目標、目前能力、可訓練時間、疲勞與受傷風險、偏好與限制；當資料足夠後，再產出一份可儲存、可審核、可修改的客製訓練課表。

本文件只提出調整建議與風險，不直接修改現有功能。

## 2. 建議結論

建議採用「對話收集階段」與「課表產生階段」分離的設計。

1. 對話收集階段：
   - 新增聊天對話框，讓使用者補充或修正訓練背景。
   - LLM 只負責提問、整理資訊、判斷資料是否足夠。
   - 不在每則訊息後立即產生完整課表，避免成本過高與結果不穩定。

2. 課表產生階段：
   - 使用整理後的對話摘要、既有個人資料與訓練目標，呼叫現有 `planning-agent` 類似的結構化輸出流程。
   - 保留目前 `aiTrainingPlanDraftSchema` 作為最終課表格式，避免前端與資料庫大幅改動。
   - 產生後仍以 `TrainingPlanVersion` 草稿方式保存，讓使用者確認後才啟用。

這樣可以把改動控制在最小範圍，同時讓使用者感受到「被詢問與理解」後再產出課表。

## 3. 目前流程觀察

### 3.1 現有主要檔案

- `src/components/training/ai-plan-generator.tsx`
  - 目前提供單一 AI 產生按鈕。
  - 使用者按下後直接呼叫 server action。

- `src/app/planner/ai-actions.ts`
  - 讀取最新 `UserProfile` 與最新 `TrainingGoal`。
  - 檢查必要欄位，例如目前週跑量與每週可訓練天數。
  - 呼叫 `createTrainingPlanDraft`。
  - 將 AI 結果寫入訓練計畫與每日課表資料表。

- `src/services/ai/planning-agent.ts`
  - 組裝訓練計畫 prompt。
  - 使用 OpenAI structured output 解析為固定 schema。
  - 回傳 `draft`、`aiModel` 與 `promptSnapshot`。

- `src/schemas/ai/training-plan.ts`
  - 定義 AI 最終訓練課表輸出格式。
  - 包含 `title`、`summary`、`trainingCycleSummary`、`riskWarnings`、`missingInformation`、`trainingDays` 與營養建議。

- `prisma/schema.prisma`
  - 目前已有 `promptSnapshot` 可保存 AI 產生依據。
  - 尚無明確的對話紀錄或對話摘要資料表。

### 3.2 現有流程優點

- 最終輸出已有固定 schema，前端與資料庫可穩定解析。
- 課表以 draft version 儲存，符合「先產生、再確認」的安全流程。
- `promptSnapshot` 已能保留 AI 產生依據，方便追蹤與除錯。

### 3.3 現有流程限制

- 使用者只能透過固定表單欄位提供資訊，難以表達特殊情境。
- LLM 無法在資料不足時先追問，只能回傳 `missingInformation` 或產出保守課表。
- 使用者可能不理解需要補哪些資料，降低課表品質。
- 單次生成容易把「需求澄清」與「課表生成」混在一起，導致結果不穩。

## 4. 建議使用者流程

### 4.1 第一階段：開啟對話

在 `/planner` 頁面把目前的 AI 產生區塊調整為「AI 課表規劃對話」。

建議畫面包含：

- 對話訊息列表
- 使用者輸入框
- 「產生課表」按鈕
- 對話狀態提示，例如：
  - 仍需補充資料
  - 已可產生課表
  - 偵測到受傷或疲勞風險

### 4.2 第二階段：LLM 追問與整理

LLM 不直接產出完整課表，而是根據既有資料判斷缺口並追問。

建議優先追問：

- 目標賽事或訓練目標是否明確
- 每週可訓練天數與可訓練時段
- 目前週跑量、近期配速或完賽時間
- 最近疲勞、疼痛、傷病或睡眠狀況
- 偏好的訓練型態與不想安排的日子
- 飲食限制或補給限制

### 4.3 第三階段：產生對話摘要

當使用者按下「產生課表」時，不建議直接把完整聊天紀錄塞進課表 prompt。建議先產生一份結構化摘要。

摘要應包含：

- 使用者目標
- 目前能力與訓練量
- 可訓練時間與限制
- 傷病、疼痛、疲勞或風險
- 使用者偏好
- LLM 判定仍不足的資訊
- 安全保守原則

### 4.4 第四階段：產生課表草稿

以「使用者資料 + 訓練目標 + 對話摘要」作為 `planning-agent` 輸入，產生符合 `aiTrainingPlanDraftSchema` 的課表草稿。

產出後維持現有行為：

- 建立 `TrainingPlan`
- 建立第 1 版 `TrainingPlanVersion`
- 建立每日 `TrainingDay`
- 建立每日 `NutritionSuggestion`
- 狀態維持 `draft`
- 使用者確認後才設為 active

## 5. 建議技術調整

### 5.1 前端元件

建議新增或調整：

- `src/components/training/ai-plan-chat.tsx`
  - 顯示聊天訊息、輸入框與產生課表按鈕。
  - 取代或並列目前 `AiPlanGenerator`。

- `src/components/training/ai-plan-generator.tsx`
  - 可保留為舊版單次產生入口。
  - 若要最小改動，可先在此元件內加入「開啟對話」模式，而不是立刻移除舊功能。

建議 UI 狀態：

- `idle`：尚未開始對話
- `chatting`：使用者正在補充資訊
- `ready_to_generate`：資料足夠，可產生課表
- `generating`：課表產生中
- `generated`：已產生草稿
- `error`：AI 或儲存失敗

### 5.2 Server actions

建議新增：

- `sendTrainingPlanChatMessage`
  - 接收使用者訊息。
  - 讀取既有 profile/goal。
  - 呼叫新的 conversation agent。
  - 回傳 LLM 回覆、資料完整度與風險提示。

- `generateTrainingPlanFromConversation`
  - 接收對話 session id 或對話摘要。
  - 產生結構化摘要。
  - 呼叫課表產生 agent。
  - 沿用現有 transaction 寫入訓練計畫。

現有 `generateAiTrainingPlanDraft` 可保留，避免一次性破壞既有流程。

### 5.3 AI agent 拆分

建議拆成兩個 agent：

- `conversation-agent`
  - 目的：追問、整理、判斷資料是否足夠。
  - 輸出：對話回覆、缺少資訊、風險旗標、是否可產生課表。
  - 不輸出完整每日課表。

- `planning-agent`
  - 目的：根據固定輸入產生結構化課表。
  - 輸出：沿用 `aiTrainingPlanDraftSchema`。
  - 必須遵守訓練安全與輸出格式限制。

### 5.4 Schema 建議

建議新增對話階段 schema：

```ts
const aiPlanningConversationSchema = z.object({
  assistantMessage: z.string(),
  readiness: z.enum(["needs_more_info", "ready_to_generate", "high_risk"]),
  missingInformation: z.array(z.string()),
  collectedFacts: z.object({
    goal: z.string().nullable(),
    currentFitness: z.string().nullable(),
    weeklyAvailability: z.string().nullable(),
    injuryOrPain: z.string().nullable(),
    fatigue: z.string().nullable(),
    preferences: z.string().nullable(),
    nutritionLimits: z.string().nullable()
  }),
  riskWarnings: z.array(z.string()),
  suggestedNextQuestion: z.string().nullable()
});
```

最終課表仍沿用：

- `aiTrainingPlanDraftSchema`
- `aiTrainingDaySchema`
- `aiNutritionSuggestionSchema`

這樣可以避免立即變更既有 `TrainingDay` 與 `NutritionSuggestion` 儲存格式。

## 6. 資料儲存建議

### 6.1 最小改動方案

短期可不新增資料表，只在使用者產生課表時，把對話摘要寫入 `TrainingPlanVersion.promptSnapshot`。

優點：

- 不需要 Prisma migration。
- 對現有資料表影響最小。
- 適合先做 MVP。

限制：

- 無法恢復完整對話歷史。
- 使用者重新整理頁面後，對話內容可能遺失。
- 不利於後續追蹤「哪一輪對話造成課表決策」。

### 6.2 建議正式方案

若要完整支援對話式體驗，建議新增兩個資料表。

`TrainingPlanConversation`

- `id`: String，主鍵
- `userProfileId`: String，必填
- `trainingGoalId`: String?，可選
- `status`: String，建議值 `active`、`completed`、`discarded`
- `summary`: String?，保存對話整理摘要
- `readiness`: String，保存目前是否可產生
- `riskLevel`: String?，例如 `normal`、`caution`、`high_risk`
- `createdAt`: DateTime
- `updatedAt`: DateTime

`TrainingPlanConversationMessage`

- `id`: String，主鍵
- `conversationId`: String，必填
- `role`: String，`user` 或 `assistant`
- `content`: String，必填
- `metadataJson`: String?，保存缺漏欄位、風險旗標或模型資訊
- `createdAt`: DateTime

若採用正式方案，需補充舊資料相容性說明：既有 `TrainingPlan` 不需要回填 conversation id，只有新流程產生的課表才關聯對話。

### 6.3 不建議的儲存方式

不建議把完整對話塞入 `TrainingPlanVersion.summary`。

原因：

- `summary` 是給使用者看的版本摘要，不適合作為內部 prompt 紀錄。
- 對話可能很長，會影響畫面可讀性。
- 後續若要解析對話內容會變得困難。

## 7. Prompt 設計建議

### 7.1 Conversation prompt 原則

對話階段 prompt 應要求 LLM：

- 不做醫療診斷。
- 若使用者提到疼痛、受傷、過度疲勞，優先提醒降低強度或尋求專業協助。
- 每次最多問 1 到 3 個關鍵問題，避免使用者負擔過重。
- 不要在資料不足時編造能力、週跑量或賽事日期。
- 明確標示還缺哪些資訊。
- 當資料足夠時，回報可以產生課表，但仍不要直接輸出完整課表。

### 7.2 Planning prompt 原則

課表產生 prompt 應保留現有安全規則，並額外加入對話摘要：

- 使用者明確說過的偏好優先於系統推測。
- 若對話摘要與 profile/goal 衝突，應在 `missingInformation` 或 `riskWarnings` 提出，不應自行選邊。
- 不得突然大幅增加跑量、強度或訓練頻率。
- 若有高風險訊號，課表應保守安排，並在 `riskWarnings` 說明。
- 最終輸出必須符合 `aiTrainingPlanDraftSchema`。

## 8. 錯誤處理建議

### 8.1 對話階段

建議錯誤訊息：

- 沒有個人資料：
  - 「請先建立個人資料，AI 才能根據你的狀態規劃課表。」

- 沒有訓練目標：
  - 「請先設定訓練目標，或在對話中告訴 AI 你的目標距離與日期。」

- AI 回傳格式錯誤：
  - 「AI 回覆格式無法解析，請再送出一次，或改用較簡短的描述。」

- 高風險狀態：
  - 「你提到疼痛、受傷或明顯疲勞。系統可以產生保守建議，但不會取代醫療或專業教練判斷。」

### 8.2 課表產生階段

建議保留現有錯誤處理，並新增：

- 對話資料不足：
  - 「目前資訊還不足以產生合理課表，請先補充每週可訓練天數、目前訓練量與是否有疼痛或受傷。」

- 對話摘要與目標衝突：
  - 「對話內容與既有目標不一致，請先確認目標距離、比賽日期或每週訓練天數。」

- 無法儲存對話或課表：
  - 「課表已產生但儲存失敗，請稍後再試。系統不會覆蓋既有課表。」

## 9. 風險與對策

### 9.1 AI 安全風險

風險：

- 使用者可能描述疼痛、傷病或過度疲勞，但 LLM 仍產生高強度課表。

對策：

- Conversation agent 必須先標記 `high_risk`。
- Planning agent 遇到高風險時只能產生保守課表，並加入明顯 `riskWarnings`。
- 前端需把風險提醒放在產生按鈕附近與課表摘要中，不可隱藏。

### 9.2 資料不足風險

風險：

- 對話資訊不足時，LLM 可能自行假設使用者能力。

對策：

- Conversation agent 需回傳 `missingInformation`。
- 若缺少目前週跑量、每週可訓練天數、傷病狀態等核心資料，不允許產生完整課表。
- Planning prompt 明確禁止編造。

### 9.3 對話與既有資料衝突

風險：

- 使用者在對話中說「每週只能跑 3 天」，但 profile/goal 記錄是 5 天。

對策：

- 對話摘要應保留衝突欄位。
- 產生前要求使用者確認以哪個資訊為準。
- 不建議自動覆蓋 `TrainingGoal`，除非使用者明確確認。

### 9.4 成本與延遲風險

風險：

- 每則聊天都呼叫 LLM，且最後又呼叫一次課表產生，成本與等待時間會上升。

對策：

- 對話階段只要求短回覆與結構化狀態，不產生完整課表。
- 最終課表只在使用者按下產生按鈕後產生一次。
- 可限制對話最多保留最近 N 則訊息，並搭配對話摘要。

### 9.5 儲存與隱私風險

風險：

- 對話可能包含健康、傷病、生活作息等敏感資訊。

對策：

- 本機端只保存必要對話摘要。
- 若保存完整對話，需讓使用者知道對話會被保留於本機資料庫。
- 不在 debug log 或 client console 輸出完整 prompt。

### 9.6 輸出格式不穩風險

風險：

- 對話式輸入更自由，可能導致最終課表 schema 解析失敗。

對策：

- 對話階段與課表階段分開。
- 最終仍使用 structured output 與 Zod schema 驗證。
- schema parse 失敗時不寫入任何課表資料。

### 9.7 使用者體驗風險

風險：

- LLM 問太多問題，使用者覺得流程變長。

對策：

- 每次最多問 1 到 3 個問題。
- 顯示「目前已足夠產生課表」狀態。
- 允許使用者略過部分非必要資料，但高風險與核心訓練資料不可略過。

## 10. 建議分階段導入

### 10.1 第一階段：不改資料庫的 MVP

目標：

- 新增對話 UI。
- 新增 conversation agent。
- 對話只存在前端 state 或 server action 回傳中。
- 最終產生時，把對話摘要併入 `promptSnapshot`。
- 最終課表仍走現有 `TrainingPlan` 寫入流程。

優點：

- 改動小。
- 可快速驗證使用者是否喜歡對話式流程。
- 不影響既有課表資料結構。

### 10.2 第二階段：保存對話 session

目標：

- 新增 `TrainingPlanConversation` 與 message 資料表。
- 使用者可中斷後繼續對話。
- 課表版本可追溯來源對話。

注意：

- 需新增 Prisma migration。
- 需定義對話刪除或封存規則。
- 需避免對話資料暴露於不必要的畫面。

### 10.3 第三階段：對話後修訂課表

目標：

- 使用者可以針對已產生課表繼續對話，例如「週三不要排間歇」、「長跑改週日」。
- 產生新的 `TrainingPlanVersion`，不覆蓋既有版本。

注意：

- 應與現有 replanning/adjustment 流程整合。
- 調整結果仍需保留 draft -> confirmed 流程。

## 11. 建議測試項目

### 11.1 單元測試

- Conversation schema 可解析正常回覆。
- Conversation schema 拒絕缺少必要欄位的 AI 回覆。
- 對話摘要能正確標記 missing information。
- 高風險文字能被標記為 `high_risk`。
- 最終課表仍符合 `aiTrainingPlanDraftSchema`。

### 11.2 整合測試

- 使用者有 profile 與 goal 時，可以開始對話。
- 資料不足時，系統不允許直接產生完整課表。
- 資料足夠時，可以從對話摘要產生 draft plan。
- 產生失敗時，不會寫入半套 `TrainingPlan` 或 `TrainingDay`。
- 課表產生後，`/planner` 與 `/calendar` 可正常刷新。

### 11.3 UI 測試

- 對話訊息不會在手機版溢出。
- 產生中按鈕不可重複點擊。
- 錯誤訊息能讓使用者知道下一步。
- 風險提醒在畫面上清楚可見。
- 已產生的草稿仍可由既有版本列表確認或封存。

## 12. 實作優先順序建議

1. 新增 conversation schema 與 agent，不動現有 planning schema。
2. 新增聊天 UI，但保留舊 AI 產生流程作為 fallback。
3. 新增從對話摘要產生課表的 server action。
4. 將對話摘要寫入 `promptSnapshot`。
5. 補齊錯誤訊息與高風險提示。
6. 驗證 `/planner`、`/calendar`、版本確認流程不受影響。
7. 若 MVP 驗證成功，再新增正式對話資料表。

## 13. 不建議一次完成的項目

- 不建議一開始就移除目前單次產生 AI 課表功能。
- 不建議一開始就讓 LLM 自動修改 `TrainingGoal`。
- 不建議把聊天紀錄與最終課表混在同一個 schema。
- 不建議在對話中直接逐日生成課表，成本高且難以維持格式一致。
- 不建議未經使用者確認就把高風險課表設為 active。

## 14. 總結

建議採用漸進式調整：先加入對話式需求收集，再沿用目前結構化課表產生與 draft version 儲存流程。這能提升課表客製化程度，同時維持現有資料模型與操作流程穩定。

短期最佳方案是不新增資料表，只把對話摘要納入最終 prompt 與 `promptSnapshot`。中長期若需要恢復對話、追蹤決策來源或支援對話式修訂課表，再新增 conversation/session 相關資料表。
