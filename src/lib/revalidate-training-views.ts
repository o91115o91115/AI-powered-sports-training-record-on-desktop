import { revalidatePath } from "next/cache";

const trainingViewPaths = [
  "/",
  "/dashboard",
  "/goals",
  "/planner",
  "/calendar",
  "/adjustments",
  "/history"
] as const;

// 主要資料彼此會跨頁顯示，寫入後統一失效可避免本機頁面讀到不同版本的資料。
export function revalidateTrainingViews() {
  for (const path of trainingViewPaths) {
    revalidatePath(path);
  }
}
