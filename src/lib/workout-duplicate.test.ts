import { describe, expect, it } from "vitest";

import { isPossibleWorkoutDuplicate } from "./workout-duplicate";

describe("workout duplicate reminder", () => {
  it("flags the same raw input after normalizing whitespace", () => {
    expect(
      isPossibleWorkoutDuplicate(
        { rawInput: "今日跑 13 km，配速 6:45/km" },
        { rawInput: "今日跑13 km，配速 6:45/km" }
      )
    ).toBe(true);
  });

  it("flags matching activity type, distance, and pace", () => {
    expect(
      isPossibleWorkoutDuplicate(
        { workoutType: "跑步", distanceKm: 13, pace: "6:45/km" },
        { workoutType: "跑步", distanceKm: 13, pace: "6:45/km" }
      )
    ).toBe(true);
  });

  it("does not flag a clearly different second workout", () => {
    expect(
      isPossibleWorkoutDuplicate(
        { workoutType: "游泳", distanceKm: 1 },
        { workoutType: "跑步", distanceKm: 13, pace: "6:45/km" }
      )
    ).toBe(false);
  });

  it("does not flag matching distance alone", () => {
    expect(
      isPossibleWorkoutDuplicate(
        { workoutType: "跑步", distanceKm: 5, pace: "6:00/km" },
        { workoutType: "跑步", distanceKm: 5, pace: "5:00/km" }
      )
    ).toBe(false);
  });
});
