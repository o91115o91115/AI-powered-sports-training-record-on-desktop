# AI 運動訓練與飲食紀錄系統

本專案是本機端 Web App，使用 Next.js、TypeScript、Prisma、SQLite 與 OpenAI API 建置。

## 開發環境

```bash
pnpm install
pnpm prisma:migrate
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
```

不要提交真實 API key。
