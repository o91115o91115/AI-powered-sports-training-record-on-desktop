export const sportCategories = [
  "running",
  "swimming",
  "cycling",
  "strength_training"
] as const;

export type SportCategory = (typeof sportCategories)[number];

export const sportCategoryLabels: Record<SportCategory, string> = {
  running: "跑步",
  swimming: "游泳",
  cycling: "單車",
  strength_training: "重量訓練"
};

const sportCategoryKeywords: Record<SportCategory, string[]> = {
  running: [
    "easy",
    "interval",
    "long_run",
    "race",
    "run",
    "running",
    "tempo",
    "慢跑",
    "路跑",
    "跑",
    "跑步",
    "長跑",
    "節奏跑",
    "輕鬆跑",
    "間歇跑",
    "馬拉松"
  ],
  swimming: ["swim", "swimming", "游泳"],
  cycling: [
    "bike",
    "biking",
    "bicycle",
    "cycle",
    "cycling",
    "單車",
    "自行車",
    "腳踏車",
    "騎車"
  ],
  strength_training: [
    "gym",
    "lifting",
    "resistance",
    "strength",
    "strength_training",
    "weight",
    "weights",
    "健身",
    "肌力",
    "重量訓練",
    "重訓",
    "阻力訓練"
  ]
};

export function isSportCategory(value: string): value is SportCategory {
  return sportCategories.includes(value as SportCategory);
}

export function getSportCategoryLabel(value: string | null | undefined) {
  return value && isSportCategory(value)
    ? sportCategoryLabels[value]
    : "尚未分類";
}

export function toSportCategoryFormValue(
  value: string | null | undefined
): SportCategory | "" {
  return value && isSportCategory(value) ? value : "";
}

export function inferSportCategory(
  ...values: Array<string | null | undefined>
): SportCategory | null {
  const text = values
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ")
    .trim()
    .toLowerCase();

  if (!text || text === "rest" || text.includes("休息日")) {
    return null;
  }

  const matches = sportCategories.filter((category) =>
    sportCategoryKeywords[category].some(
      (keyword) => text === keyword || text.includes(keyword)
    )
  );

  // 同時命中多個分類代表內容仍有歧義，交由使用者選擇，避免錯誤回填。
  return matches.length === 1 ? matches[0] : null;
}
