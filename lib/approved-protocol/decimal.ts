const decimalPattern = /^\d{1,8}(?:\.\d{1,4})?$/;
const decimalScale = BigInt(10_000);

export function formatApprovedDecimal(value: number) {
  if (!Number.isFinite(value) || value <= 0) throw new Error("Approved doses must be positive finite numbers.");
  return value.toFixed(4).replace(/\.?0+$/, "");
}

export function parseApprovedDecimal(value: string) {
  if (!decimalPattern.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * decimalScale + BigInt(fraction.padEnd(4, "0"));
}

export function massInScaledMicrograms(value: string, unit: "mg" | "mcg") {
  const parsed = parseApprovedDecimal(value);
  if (parsed === null) return null;
  return unit === "mg" ? parsed * BigInt(1_000) : parsed;
}
