"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import {
  type SaveGoalSettingsResult,
  saveGoalSettings
} from "@/app/goals/actions";
import {
  type GoalSettingsFormValues,
  goalSettingsFormSchema
} from "@/schemas/forms/goal-settings";

type GoalSettingsFormProps = {
  initialValues: GoalSettingsFormValues;
};

const inputClass =
  "mt-2 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

const labelClass = "text-sm font-medium text-foreground";
const helpClass = "mt-1 text-xs leading-5 text-muted";
const errorClass = "mt-1 text-xs font-medium text-danger";

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className={errorClass}>{message}</p>;
}

export function GoalSettingsForm({ initialValues }: GoalSettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<SaveGoalSettingsResult | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<GoalSettingsFormValues>({
    defaultValues: initialValues,
    resolver: zodResolver(goalSettingsFormSchema)
  });

  const onSubmit = (values: GoalSettingsFormValues) => {
    setResult(null);
    startTransition(async () => {
      const actionResult = await saveGoalSettings(values);
      setResult(actionResult);

      if (actionResult.ok) {
        router.refresh();
      }
    });
  };

  return (
    <form className="space-y-8" onSubmit={handleSubmit(onSubmit)}>
      <input type="hidden" {...register("userProfileId")} />
      <input type="hidden" {...register("trainingGoalId")} />

      <section className="rounded-lg border border-line bg-panel p-6">
        <div className="border-b border-line pb-4">
          <h2 className="text-lg font-semibold text-foreground">基本資料</h2>
          <p className="mt-1 text-sm text-muted">提供 AI 後續規劃所需的個人條件。</p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className={labelClass}>
            使用者名稱
            <input className={inputClass} {...register("name")} />
            <FieldError message={errors.name?.message} />
          </label>

          <label className={labelClass}>
            性別
            <select className={inputClass} {...register("gender")}>
              <option value="">未指定</option>
              <option value="female">女性</option>
              <option value="male">男性</option>
              <option value="non_binary">非二元</option>
              <option value="prefer_not_to_say">不透露</option>
            </select>
          </label>

          <label className={labelClass}>
            年齡
            <input className={inputClass} inputMode="numeric" {...register("age")} />
            <FieldError message={errors.age?.message} />
          </label>

          <label className={labelClass}>
            身高（公分）
            <input className={inputClass} inputMode="decimal" {...register("heightCm")} />
            <FieldError message={errors.heightCm?.message} />
          </label>

          <label className={labelClass}>
            體重（公斤）
            <input className={inputClass} inputMode="decimal" {...register("weightKg")} />
            <FieldError message={errors.weightKg?.message} />
          </label>

          <label className={labelClass}>
            飲食限制
            <input
              className={inputClass}
              placeholder="例如：素食、花生過敏、避免乳製品"
              {...register("dietaryRestrictions")}
            />
            <p className={helpClass}>飲食限制會影響後續營養建議。</p>
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-line bg-panel p-6">
        <div className="border-b border-line pb-4">
          <h2 className="text-lg font-semibold text-foreground">訓練目標</h2>
          <p className="mt-1 text-sm text-muted">設定賽事、距離與預期完成方向。</p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className={labelClass}>
            目標賽事
            <input className={inputClass} {...register("raceName")} />
          </label>

          <label className={labelClass}>
            目標距離
            <select className={inputClass} {...register("targetDistance")}>
              <option value="">請選擇</option>
              <option value="5K">5K</option>
              <option value="10K">10K</option>
              <option value="Half Marathon">半馬</option>
              <option value="Marathon">全馬</option>
              <option value="Other">其他</option>
            </select>
            <FieldError message={errors.targetDistance?.message} />
          </label>

          <label className={labelClass}>
            比賽日期
            <input className={inputClass} type="date" {...register("raceDate")} />
            <FieldError message={errors.raceDate?.message} />
          </label>

          <label className={labelClass}>
            目標完賽時間
            <input
              className={inputClass}
              placeholder="例如：04:30:00 或 90 分鐘內"
              {...register("targetFinishTime")}
            />
          </label>

          <label className={labelClass}>
            目標類型
            <select className={inputClass} {...register("goalType")}>
              <option value="">未指定</option>
              <option value="finish">完賽</option>
              <option value="pb">破 PB</option>
              <option value="target_time">指定成績</option>
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-line bg-panel p-6">
        <div className="border-b border-line pb-4">
          <h2 className="text-lg font-semibold text-foreground">目前跑步能力</h2>
          <p className="mt-1 text-sm text-muted">避免後續訓練安排突然超出目前負荷。</p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className={labelClass}>
            目前週跑量（公里）
            <input
              className={inputClass}
              inputMode="decimal"
              {...register("currentWeeklyMileageKm")}
            />
            <FieldError message={errors.currentWeeklyMileageKm?.message} />
          </label>

          <label className={labelClass}>
            最近 5K 成績
            <input className={inputClass} placeholder="例如：28:30" {...register("recentFiveKTime")} />
          </label>

          <label className={labelClass}>
            最近 10K 成績
            <input className={inputClass} placeholder="例如：58:00" {...register("recentTenKTime")} />
          </label>

          <label className={labelClass}>
            最近半馬成績
            <input
              className={inputClass}
              placeholder="例如：02:10:00"
              {...register("recentHalfMarathonTime")}
            />
          </label>

          <label className="flex items-center gap-3 rounded-md border border-line px-3 py-3 text-sm font-medium text-foreground md:col-span-2">
            <input
              className="size-4 accent-primary"
              type="checkbox"
              {...register("hasMarathonExperience")}
            />
            已有全馬經驗
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-line bg-panel p-6">
        <div className="border-b border-line pb-4">
          <h2 className="text-lg font-semibold text-foreground">可訓練時間與身體狀況</h2>
          <p className="mt-1 text-sm text-muted">傷痛、疲勞與時間限制會影響後續訓練安全。</p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className={labelClass}>
            每週可訓練天數
            <input
              className={inputClass}
              inputMode="numeric"
              placeholder="1-7"
              {...register("weeklyTrainingDays")}
            />
            <FieldError message={errors.weeklyTrainingDays?.message} />
          </label>

          <label className={labelClass}>
            疲勞狀況
            <select className={inputClass} {...register("fatigueLevel")}>
              <option value="">未指定</option>
              <option value="low">低</option>
              <option value="moderate">中等</option>
              <option value="high">高</option>
              <option value="severe">嚴重</option>
            </select>
          </label>

          <label className={labelClass}>
            偏好訓練日
            <input
              className={inputClass}
              placeholder="例如：週二、週四、週日"
              {...register("preferredTrainingDays")}
            />
          </label>

          <label className={labelClass}>
            不方便訓練日期
            <input
              className={inputClass}
              placeholder="例如：2026-07-12、每週五"
              {...register("unavailableDates")}
            />
          </label>

          <label className={`${labelClass} md:col-span-2`}>
            傷痛或需避免的訓練
            <textarea
              className={`${inputClass} min-h-24 resize-y`}
              placeholder="例如：右膝跑超過 8 公里會不適，避免連續高強度。"
              {...register("injuryNote")}
            />
            <p className={helpClass}>此欄位是後續風險提醒與保守訓練安排的重要依據。</p>
          </label>
        </div>
      </section>

      <div className="flex flex-col gap-3 rounded-lg border border-line bg-panel p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {result ? (
            <p className={`text-sm font-medium ${result.ok ? "text-primary" : "text-danger"}`}>
              {result.message}
            </p>
          ) : (
            <p className="text-sm text-muted">儲存後可重新整理頁面確認資料已寫入本機資料庫。</p>
          )}
        </div>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending}
          type="submit"
        >
          <Save size={16} />
          {isPending ? "儲存中" : "儲存設定"}
        </button>
      </div>
    </form>
  );
}
