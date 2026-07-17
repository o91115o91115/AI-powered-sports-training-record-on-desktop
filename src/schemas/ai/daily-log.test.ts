import { describe, expect, it } from "vitest";

import { parsedDailyLogSchema } from "./daily-log";

const baseResult = {
  workout: null,
  missingInformation: [],
  safetyNote: null
};

describe("parsedDailyLogSchema", () => {
  it("accepts an empty nutrition list when the input has no food", () => {
    const result = parsedDailyLogSchema.parse({
      ...baseResult,
      nutritionEntries: []
    });

    expect(result.nutritionEntries).toEqual([]);
  });

  it("accepts multiple meals as separate nutrition entries", () => {
    const result = parsedDailyLogSchema.parse({
      ...baseResult,
      nutritionEntries: [
        {
          mealType: "breakfast",
          foodItems: ["吐司", "豆漿"],
          estimatedCarbsG: 48,
          estimatedProteinG: 14,
          estimatedCalories: 360,
          estimateNote: "依一般份量粗估。"
        },
        {
          mealType: "post_workout",
          foodItems: ["香蕉", "飯糰"],
          estimatedCarbsG: 72,
          estimatedProteinG: 8,
          estimatedCalories: 390,
          estimateNote: "依一般份量粗估。"
        }
      ]
    });

    expect(result.nutritionEntries).toHaveLength(2);
    expect(result.nutritionEntries.map((entry) => entry.mealType)).toEqual([
      "breakfast",
      "post_workout"
    ]);
  });

  it("rejects the previous single nutrition object shape", () => {
    const result = parsedDailyLogSchema.safeParse({
      ...baseResult,
      nutrition: {
        mealType: "breakfast",
        foodItems: ["吐司"],
        estimatedCarbsG: 30,
        estimatedProteinG: 6,
        estimatedCalories: 180,
        estimateNote: "依一般份量粗估。"
      }
    });

    expect(result.success).toBe(false);
  });
});
