/**
 * lib/utils/time.ts
 *
 * Universal, float-safe time formatting utility for REEC Academy.
 * Eliminates all floating-point precision artifacts (e.g. 50.9999999999)
 * across the entire application.
 */

/**
 * Normalizes any number of minutes to a safe, non-negative integer.
 */
export function normalizeMinutes(minutes: number | null | undefined): number {
  if (typeof minutes !== "number" || isNaN(minutes) || !isFinite(minutes)) {
    return 0;
  }
  return Math.max(0, Math.round(minutes));
}

/**
 * Formats minutes into human-readable compact duration (e.g. "45m", "1h 15m", "2h").
 * Guaranteed to never display floating-point artifacts.
 */
export function formatStudyTime(minutes: number | null | undefined): string {
  const totalMins = normalizeMinutes(minutes);
  if (totalMins < 60) {
    return `${totalMins}m`;
  }
  const hrs = Math.floor(totalMins / 60);
  const remaining = totalMins % 60;
  return remaining > 0 ? `${hrs}h ${remaining}m` : `${hrs}h`;
}

/**
 * Formats minutes into short single-unit duration (e.g. "45m", "1.5h", "2h").
 * Guaranteed to never display floating-point artifacts.
 */
export function formatStudyTimeShort(minutes: number | null | undefined): string {
  const totalMins = normalizeMinutes(minutes);
  if (totalMins < 60) {
    return `${totalMins}m`;
  }
  const hrs = Math.round((totalMins / 60) * 10) / 10;
  const hrsStr = hrs.toFixed(1).replace(/\.0$/, "");
  return `${hrsStr}h`;
}

/**
 * Formats minutes into split value and unit for metric cards.
 * E.g. { value: "45", unit: "mins" } or { value: "1.5", unit: "hours" }
 */
export function formatStudyTimeMetric(minutes: number | null | undefined): {
  value: string;
  unit: string;
  display: string;
} {
  const totalMins = normalizeMinutes(minutes);
  if (totalMins < 60) {
    return {
      value: totalMins.toString(),
      unit: "mins",
      display: `${totalMins} mins`,
    };
  }
  const hrs = Math.round((totalMins / 60) * 10) / 10;
  const hrsStr = hrs.toFixed(1).replace(/\.0$/, "");
  const unit = hrs === 1 ? "hour" : "hours";
  return {
    value: hrsStr,
    unit,
    display: `${hrsStr} ${unit}`,
  };
}
