export const toDateInput = (value: Date | null | undefined) =>
  value ? value.toISOString().slice(0, 10) : "";

export const getTaipeiDateInput = (value = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Taipei",
    year: "numeric"
  }).formatToParts(value);
  const values = new Map(parts.map((part) => [part.type, part.value]));

  return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
};

export const parseDateInput = (value: string) =>
  new Date(`${value}T00:00:00.000Z`);

export const isFutureDateInput = (value: string, today = getTaipeiDateInput()) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && value > today;
