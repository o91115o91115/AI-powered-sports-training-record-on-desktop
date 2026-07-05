"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import {
  TodayTrainingPanel,
  type TodayTrainingDay
} from "@/components/training/today-training-panel";
import type { NutritionSuggestionPanelData } from "@/components/training/nutrition-suggestion-panel";

export type CalendarTrainingDay = TodayTrainingDay & {
  nutritionSuggestion: NutritionSuggestionPanelData | null;
};

export type CalendarPlanData = {
  id: string;
  title: string;
  status: string;
  startDate: string;
  endDate: string;
  goalLabel: string;
  activeVersion: {
    id: string;
    versionNumber: number;
    summary: string | null;
    status: string;
    trainingDays: CalendarTrainingDay[];
  } | null;
};

type CalendarMode = "year" | "month" | "week" | "day";

type TrainingCalendarViewProps = {
  plan: CalendarPlanData | null;
  todayDate: string;
  todayLabel: string;
};

const modeLabels: Record<CalendarMode, string> = {
  year: "年",
  month: "月",
  week: "週",
  day: "日"
};

const weekdayLabels = ["日", "一", "二", "三", "四", "五", "六"];
const monthLabels = [
  "1 月",
  "2 月",
  "3 月",
  "4 月",
  "5 月",
  "6 月",
  "7 月",
  "8 月",
  "9 月",
  "10 月",
  "11 月",
  "12 月"
];

const statusStyles: Record<string, string> = {
  planned: "border-line bg-panel text-muted",
  completed: "border-primary bg-primary/10 text-primary",
  partial: "border-accent bg-accent/10 text-accent",
  missed: "border-danger bg-danger/10 text-danger",
  changed: "border-line bg-background text-foreground",
  rest: "border-line bg-panel text-muted"
};

const formatDate = (value: string) => value || "未設定";

const parseDateInput = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const toDateInput = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const addDays = (value: Date, amount: number) => {
  const next = new Date(value);
  next.setDate(next.getDate() + amount);
  return next;
};

const addMonths = (value: Date, amount: number) => {
  const next = new Date(value);
  next.setMonth(next.getMonth() + amount);
  return next;
};

const addYears = (value: Date, amount: number) => {
  const next = new Date(value);
  next.setFullYear(next.getFullYear() + amount);
  return next;
};

const getMonthGrid = (year: number, monthIndex: number) => {
  const firstDay = new Date(year, monthIndex, 1);
  const start = addDays(firstDay, -firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
};

const getWeekGrid = (value: Date) => {
  const start = addDays(value, -value.getDay());
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
};

const formatSelectedDateLabel = (dateInput: string) =>
  parseDateInput(dateInput).toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long"
  });

const getTrainingSummary = (day: CalendarTrainingDay) => {
  if (day.trainingType === "rest") {
    return "休息";
  }

  if (day.targetDistanceKm) {
    return `${day.trainingTypeLabel} ${day.targetDistanceKm} km`;
  }

  if (day.targetDurationMin) {
    return `${day.trainingTypeLabel} ${day.targetDurationMin} 分`;
  }

  return day.trainingTypeLabel;
};

export function TrainingCalendarView({
  plan,
  todayDate,
  todayLabel
}: TrainingCalendarViewProps) {
  const [mode, setMode] = useState<CalendarMode>("month");
  const [focusDate, setFocusDate] = useState(() => parseDateInput(todayDate));
  const [selectedDate, setSelectedDate] = useState(todayDate);

  const trainingDays = useMemo(
    () => plan?.activeVersion?.trainingDays ?? [],
    [plan?.activeVersion?.trainingDays]
  );
  const dayByDate = useMemo(() => {
    return new Map(trainingDays.map((day) => [day.date, day]));
  }, [trainingDays]);

  if (!plan) {
    return (
      <section className="rounded-lg border border-line bg-panel p-6">
        <h2 className="text-lg font-semibold text-foreground">尚未有執行中的訓練計畫</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          請先到訓練計畫頁確認一個版本，確認後這裡會顯示每日任務與訓練紀錄。
        </p>
        <Link
          className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white"
          href="/planner"
        >
          前往訓練計畫
        </Link>
      </section>
    );
  }

  if (!plan.activeVersion) {
    return (
      <section className="rounded-lg border border-line bg-panel p-6">
        <h2 className="text-lg font-semibold text-foreground">目前計畫沒有 active version</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          「{plan.title}」已是執行中計畫，但尚未指定可執行版本。請回到訓練計畫頁確認版本。
        </p>
        <Link
          className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white"
          href="/planner"
        >
          檢查計畫版本
        </Link>
      </section>
    );
  }

  const todayTraining = dayByDate.get(todayDate) ?? null;
  const selectedTraining = dayByDate.get(selectedDate) ?? null;
  const selectedDateLabel = formatSelectedDateLabel(selectedDate);

  const shiftFocus = (direction: -1 | 1) => {
    setFocusDate((current) => {
      if (mode === "year") {
        return addYears(current, direction);
      }

      if (mode === "month") {
        return addMonths(current, direction);
      }

      if (mode === "week") {
        return addDays(current, direction * 7);
      }

      return addDays(current, direction);
    });
  };

  const selectDate = (date: Date) => {
    const nextDate = toDateInput(date);
    setSelectedDate(nextDate);
    setFocusDate(date);
  };

  const renderDayButton = (date: Date, options?: { compact?: boolean; muted?: boolean }) => {
    const dateInput = toDateInput(date);
    const day = dayByDate.get(dateInput);
    const isToday = dateInput === todayDate;
    const isSelected = dateInput === selectedDate;
    const statusClass = day
      ? statusStyles[day.completionStatus] ?? statusStyles.planned
      : "border-line bg-background text-muted";

    return (
      <button
        className={`min-h-24 rounded-md border p-2 text-left transition ${
          isSelected
            ? "border-primary bg-primary text-white"
            : `${statusClass} hover:border-primary`
        } ${options?.compact ? "min-h-14" : ""} ${
          options?.muted && !isSelected ? "opacity-45" : ""
        }`}
        key={dateInput}
        onClick={() => selectDate(date)}
        type="button"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold">{date.getDate()}</span>
          {isToday ? (
            <span
              className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                isSelected ? "bg-white text-primary" : "bg-primary text-white"
              }`}
            >
              今日
            </span>
          ) : null}
        </div>
        {day ? (
          <div
            className={`mt-2 rounded px-2 py-1 text-xs leading-5 ${
              isSelected ? "bg-white/15 text-white" : "bg-background/70"
            }`}
          >
            <p className="font-semibold">{getTrainingSummary(day)}</p>
            <p>{day.statusLabel}</p>
          </div>
        ) : null}
      </button>
    );
  };

  const renderYearView = () => (
    <div className="grid gap-4 xl:grid-cols-3">
      {monthLabels.map((monthLabel, monthIndex) => {
        const monthDays = getMonthGrid(focusDate.getFullYear(), monthIndex);

        return (
          <section className="rounded-lg border border-line bg-background p-3" key={monthLabel}>
            <h3 className="text-sm font-semibold text-foreground">{monthLabel}</h3>
            <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted">
              {weekdayLabels.map((weekday) => (
                <span key={weekday}>{weekday}</span>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {monthDays.map((date) => {
                const dateInput = toDateInput(date);
                const day = dayByDate.get(dateInput);
                const isCurrentMonth = date.getMonth() === monthIndex;
                const isSelected = dateInput === selectedDate;

                return (
                  <button
                    className={`aspect-square rounded text-xs font-medium ${
                      isSelected
                        ? "bg-primary text-white"
                        : day
                          ? statusStyles[day.completionStatus] ?? statusStyles.planned
                          : "bg-transparent text-muted"
                    } ${isCurrentMonth ? "" : "opacity-25"}`}
                    key={dateInput}
                    onClick={() => selectDate(date)}
                    type="button"
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );

  const renderMonthView = () => {
    const days = getMonthGrid(focusDate.getFullYear(), focusDate.getMonth());

    return (
      <div>
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-muted">
          {weekdayLabels.map((weekday) => (
            <span key={weekday}>{weekday}</span>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-7">
          {days.map((date) =>
            renderDayButton(date, { muted: date.getMonth() !== focusDate.getMonth() })
          )}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const days = getWeekGrid(focusDate);

    return (
      <div className="grid gap-2 md:grid-cols-7">
        {days.map((date) => (
          <div key={toDateInput(date)}>
            <p className="mb-2 text-center text-xs font-semibold text-muted">
              {weekdayLabels[date.getDay()]}
            </p>
            {renderDayButton(date)}
          </div>
        ))}
      </div>
    );
  };

  const renderDayView = () => {
    const focusDateInput = toDateInput(focusDate);

    return (
      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <div className="rounded-lg border border-line bg-background p-4">
          <p className="text-sm font-semibold text-muted">目前日期</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatSelectedDateLabel(focusDateInput)}
          </p>
          <button
            className="mt-4 w-full rounded-md border border-line bg-panel px-3 py-2 text-sm font-semibold text-foreground"
            onClick={() => selectDate(new Date())}
            type="button"
          >
            回到今天
          </button>
        </div>
        <TodayTrainingPanel
          canReport={focusDateInput <= todayDate}
          dateLabel={formatSelectedDateLabel(focusDateInput)}
          day={dayByDate.get(focusDateInput) ?? null}
          emptyMessage="這一天沒有安排訓練。可切換到月檢視查看附近日期的計畫。"
          title="當日訓練內容"
        />
      </div>
    );
  };

  const weekGrid = getWeekGrid(focusDate);
  const focusTitle =
    mode === "year"
      ? `${focusDate.getFullYear()} 年`
      : mode === "month"
        ? `${focusDate.getFullYear()} 年 ${focusDate.getMonth() + 1} 月`
        : mode === "week"
          ? `${toDateInput(weekGrid[0])} - ${toDateInput(weekGrid[6])}`
          : formatSelectedDateLabel(toDateInput(focusDate));

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-line bg-panel p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-accent">Active Plan</p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">{plan.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{plan.goalLabel}</p>
          </div>
          <div className="grid gap-2 text-sm text-muted sm:grid-cols-3 lg:min-w-[460px]">
            <div className="rounded-md border border-line bg-background p-3">
              <p className="text-xs font-semibold">期間</p>
              <p className="mt-1">
                {formatDate(plan.startDate)} - {formatDate(plan.endDate)}
              </p>
            </div>
            <div className="rounded-md border border-line bg-background p-3">
              <p className="text-xs font-semibold">版本</p>
              <p className="mt-1">V{plan.activeVersion.versionNumber}</p>
            </div>
            <div className="rounded-md border border-line bg-background p-3">
              <p className="text-xs font-semibold">天數</p>
              <p className="mt-1">{trainingDays.length} 天</p>
            </div>
          </div>
        </div>
        {plan.activeVersion.summary ? (
          <p className="mt-4 rounded-md border border-line bg-background p-3 text-sm leading-6 text-muted">
            {plan.activeVersion.summary}
          </p>
        ) : null}
      </section>

      <TodayTrainingPanel
        canReport
        dateLabel={todayLabel}
        day={todayTraining}
        emptyMessage="今日沒有安排訓練。若這不是預期結果，請回到訓練計畫確認 active version 的日期範圍。"
        title="今日任務"
      />

      <section className="rounded-lg border border-line bg-panel p-5">
        <div className="flex flex-col gap-4 border-b border-line pb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CalendarDays size={18} className="text-primary" />
                <h2 className="text-lg font-semibold text-foreground">訓練月曆</h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted">
                切換年、月、週、日檢視整體安排；點擊日期後可查看與回報當日訓練結果。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                aria-label="上一個期間"
                className="rounded-md border border-line bg-background p-2 text-foreground"
                onClick={() => shiftFocus(-1)}
                type="button"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="min-w-48 rounded-md bg-background px-3 py-2 text-center text-sm font-semibold text-foreground">
                {focusTitle}
              </span>
              <button
                aria-label="下一個期間"
                className="rounded-md border border-line bg-background p-2 text-foreground"
                onClick={() => shiftFocus(1)}
                type="button"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {(Object.keys(modeLabels) as CalendarMode[]).map((calendarMode) => (
              <button
                className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                  mode === calendarMode
                    ? "border-primary bg-primary text-white"
                    : "border-line bg-background text-foreground"
                }`}
                key={calendarMode}
                onClick={() => setMode(calendarMode)}
                type="button"
              >
                {modeLabels[calendarMode]}
              </button>
            ))}
            <button
              className="rounded-md border border-line bg-background px-3 py-2 text-sm font-semibold text-foreground"
              onClick={() => {
                const today = parseDateInput(todayDate);
                setFocusDate(today);
                setSelectedDate(todayDate);
              }}
              type="button"
            >
              今天
            </button>
          </div>
        </div>

        <div className="mt-5">
          {trainingDays.length === 0 ? (
            <p className="rounded-md border border-line bg-background p-4 text-sm text-muted">
              此版本尚未建立每日訓練安排，請回到訓練計畫頁補齊訓練日。
            </p>
          ) : mode === "year" ? (
            renderYearView()
          ) : mode === "month" ? (
            renderMonthView()
          ) : mode === "week" ? (
            renderWeekView()
          ) : (
            renderDayView()
          )}
        </div>
      </section>

      {mode !== "day" ? (
        <TodayTrainingPanel
          canReport={selectedDate <= todayDate}
          dateLabel={selectedDateLabel}
          day={selectedTraining}
          emptyMessage="選取的日期沒有安排訓練。可點擊其他日期查看完整內容。"
          title="選取日期內容"
        />
      ) : null}
    </div>
  );
}
