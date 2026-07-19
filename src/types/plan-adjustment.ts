import type { AiPlanAdjustmentConversation } from "@/schemas/ai/replanning";
import type { PlanningConversationMessage } from "@/schemas/ai/planning-conversation";

export type PlanAdjustmentFeedbackItem = {
  id: string;
  summary: string;
  riskWarning: string | null;
  nextStepSuggestion: string | null;
  shouldReplan: boolean;
  createdAt: string;
};

export type PlanAdjustmentConversationItem = {
  id: string;
  conversation: AiPlanAdjustmentConversation | null;
  messages: PlanningConversationMessage[];
};

export type PlanAdjustmentFieldChange = {
  field: string;
  before: string;
  after: string;
};

export type PlanAdjustmentDayDiff = {
  date: string;
  changes: PlanAdjustmentFieldChange[];
};

export type PlanAdjustmentDraftItem = {
  id: string;
  reasonDescription: string | null;
  affectedDates: string[];
  beforeSummary: string | null;
  afterSummary: string | null;
  originalVersionNumber: number;
  newVersionNumber: number;
  differences: PlanAdjustmentDayDiff[];
};

export type AdjustablePlanItem = {
  id: string;
  title: string;
  goalLabel: string;
  startDate: string;
  endDate: string;
  activeVersionLabel: string;
  feedback: PlanAdjustmentFeedbackItem[];
  initialConversation: PlanAdjustmentConversationItem | null;
  currentDraft: PlanAdjustmentDraftItem | null;
};
