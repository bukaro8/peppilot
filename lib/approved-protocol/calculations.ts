const decimalPattern = /^\d+(?:\.\d{1,6})?$/;
const scale = BigInt(1_000_000);

function scaled(value: string) {
  if (!decimalPattern.test(value) || Number(value) <= 0) throw new Error("Use a positive decimal value.");
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * scale + BigInt(fraction.padEnd(6, "0"));
}

function formatted(value: bigint) {
  const whole = value / scale;
  const fraction = String(value % scale).padStart(6, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : String(whole);
}

export function divideDecimal(dividend: string, divisor: string) {
  const left = scaled(dividend);
  const right = scaled(divisor);
  return formatted((left * scale + right / BigInt(2)) / right);
}

export function multiplyDecimal(leftValue: string, rightValue: string) {
  const left = scaled(leftValue);
  const right = scaled(rightValue);
  return formatted((left * right + scale / BigInt(2)) / scale);
}

export function calculatePreparation(vialStrengthMg: string, diluentVolumeMl: string) {
  return { concentrationMgPerMl: divideDecimal(vialStrengthMg, diluentVolumeMl) };
}

export function calculateAdministration(
  doseAmount: string,
  doseUnit: string,
  concentrationMgPerMl: string,
  syringeUnitsPerMl?: string,
) {
  const doseMg = doseUnit === "mcg" ? divideDecimal(doseAmount, "1000") : doseAmount;
  const volumeMl = divideDecimal(doseMg, concentrationMgPerMl);
  return {
    volumeMl,
    syringeUnits: syringeUnitsPerMl ? multiplyDecimal(volumeMl, syringeUnitsPerMl) : null,
  };
}
