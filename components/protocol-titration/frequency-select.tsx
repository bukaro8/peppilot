"use client";

type StandardFrequency = "daily" | "weekly" | "as_needed";

export function FrequencySelect({ name, value, onChange }: {
  name: string;
  value: string;
  onChange: (value: StandardFrequency) => void;
}) {
  const interval = value === "interval" || value === "interval_days";
  const selected = value === "days_per_week" || value === "times_per_week"
    ? "weekly" : interval ? "" : value;

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <select
        className="h-11 w-full rounded-xl border bg-background px-3"
        value={selected}
        onChange={(event) => onChange(event.target.value as StandardFrequency)}
      >
        {interval ? <option value="" disabled hidden>Interval schedule — Advanced settings</option> : null}
        <option value="daily">Daily</option>
        <option value="weekly">Choose days</option>
        <option value="as_needed">As needed</option>
      </select>
    </>
  );
}
