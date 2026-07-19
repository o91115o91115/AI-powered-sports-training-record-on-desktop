import { describe, expect, it } from "vitest";

import { getTaipeiDateInput, isFutureDateInput, parseDateInput } from "./training-date";

describe("training date safety", () => {
  it("uses the Taipei calendar date at the UTC day boundary", () => {
    expect(getTaipeiDateInput(new Date("2026-07-18T16:30:00.000Z"))).toBe("2026-07-19");
  });

  it("allows only dates after today", () => {
    expect(isFutureDateInput("2026-07-18", "2026-07-18")).toBe(false);
    expect(isFutureDateInput("2026-07-17", "2026-07-18")).toBe(false);
    expect(isFutureDateInput("2026-07-19", "2026-07-18")).toBe(true);
  });

  it("parses plan dates without local timezone drift", () => {
    expect(parseDateInput("2026-07-19").toISOString()).toBe("2026-07-19T00:00:00.000Z");
  });
});
