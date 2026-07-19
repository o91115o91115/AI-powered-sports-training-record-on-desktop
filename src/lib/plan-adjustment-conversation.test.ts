import { describe, expect, it } from "vitest";

import type { AiPlanAdjustmentConversation } from "../schemas/ai/replanning";
import {
  getMeaningfulAdjustmentText,
  isRepeatedAdjustmentQuestion,
  normalizePlanAdjustmentConversation
} from "./plan-adjustment-conversation";

const state = (
  values: Partial<AiPlanAdjustmentConversation>
): AiPlanAdjustmentConversation => ({
  assistantMessage: "我理解你希望降低訓練負擔。",
  readiness: "needs_more_info",
  missingInformation: [],
  adjustmentSummary: null,
  riskWarnings: [],
  suggestedNextQuestion: null,
  ...values
});

describe("plan adjustment conversation normalization", () => {
  it("hides punctuation-only adjustment summaries", () => {
    expect(getMeaningfulAdjustmentText("/ ")).toBeNull();
    expect(getMeaningfulAdjustmentText("降低下週訓練強度")).toBe("降低下週訓練強度");
  });

  it("recognizes repeated pain and cross-training questions", () => {
    expect(
      isRepeatedAdjustmentQuestion(
        "請問腳痛目前的嚴重程度如何？您是否願意改成低衝擊交叉訓練？",
        "請描述腳痛的程度，以及是否接受游泳或腳踏車等交叉訓練？"
      )
    ).toBe(true);
  });

  it("turns a repeated question into a warm confirmation", () => {
    const normalized = normalizePlanAdjustmentConversation(
      state({
        adjustmentSummary: "降低近期跑量並增加恢復",
        readiness: "high_risk",
        riskWarnings: ["腳部不適時應降低強度。"],
        suggestedNextQuestion: "請問腳痛目前有多嚴重？是否願意改為低衝擊交叉訓練？"
      }),
      [
        state({
          suggestedNextQuestion: "請描述腳痛程度，以及是否接受游泳或腳踏車等交叉訓練？"
        })
      ]
    );

    expect(normalized.suggestedNextQuestion).toBeNull();
    expect(normalized.missingInformation).toEqual([]);
    expect(normalized.readiness).toBe("high_risk");
    expect(normalized.assistantMessage).toContain("不會再請你重複回答相同問題");
    expect(normalized.assistantMessage).toContain("確認產生新版本");
    expect(normalized.assistantMessage).not.toContain("。。");
  });
});
