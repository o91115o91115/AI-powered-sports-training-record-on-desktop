import { describe, expect, it } from "vitest";

import {
  getSportCategoryLabel,
  inferSportCategory,
  isSportCategory
} from "./sport-category";

describe("運動分類", () => {
  it.each([
    ["easy", "running"],
    ["今日跑 5 公里", "running"],
    ["swimming", "swimming"],
    ["游泳 1 公里", "swimming"],
    ["cycling", "cycling"],
    ["室內腳踏車 45 分鐘", "cycling"],
    ["strength_training", "strength_training"],
    ["重量訓練", "strength_training"]
  ] as const)("可將 %s 分類為 %s", (value, expected) => {
    expect(inferSportCategory(value)).toBe(expected);
  });

  it("休息日不套用運動分類", () => {
    expect(inferSportCategory("rest")).toBeNull();
  });

  it("多個運動選項並存時不自行猜測", () => {
    expect(
      inferSportCategory("低衝擊交叉訓練，如游泳或踩室內腳踏車")
    ).toBeNull();
  });

  it("只接受四種標準代碼", () => {
    expect(isSportCategory("running")).toBe(true);
    expect(isSportCategory("cross_training")).toBe(false);
  });

  it("可取得使用者顯示名稱", () => {
    expect(getSportCategoryLabel("strength_training")).toBe("重量訓練");
    expect(getSportCategoryLabel(null)).toBe("尚未分類");
  });
});
