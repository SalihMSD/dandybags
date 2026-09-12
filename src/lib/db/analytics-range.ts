import { formatIndiaDate, indiaDateToUtcRange } from "@/lib/format";

export type AnalyticsDateRange = {
  start?: string;
  end?: string;
};

export const ANALYTICS_MAX_RANGE_DAYS = 365;

const ANALYTICS_MIN_DATE = "2000-01-01";

export class AnalyticsRangeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalyticsRangeError";
  }
}

export function resolveAnalyticsRange(
  range: AnalyticsDateRange | undefined,
  todayStr: string
): { start: Date; end: Date } {
  if (!range?.start && !range?.end) {
    const year = Number(todayStr.substring(0, 4));
    const month = Number(todayStr.substring(5, 7));
    const thisMonthStart = indiaDateToUtcRange(`${year}-${String(month).padStart(2, "0")}-01`);
    const nextMonth =
      month === 12
        ? `${year + 1}-01-01`
        : `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const nextMonthStart = indiaDateToUtcRange(nextMonth);
    return { start: thisMonthStart.start, end: nextMonthStart.start };
  }

  const hasStart = Boolean(range?.start);
  const hasEnd = Boolean(range?.end);

  const endDateStr = hasEnd ? range!.end! : todayStr;
  if (endDateStr > todayStr) {
    throw new AnalyticsRangeError("end date cannot be in the future");
  }

  let start: Date;
  let end: Date;

  if (hasStart && hasEnd) {
    start = indiaDateToUtcRange(range!.start!).start;
    end = indiaDateToUtcRange(range!.end!).endExclusive;
  } else if (hasStart) {
    start = indiaDateToUtcRange(range!.start!).start;
    end = indiaDateToUtcRange(todayStr).endExclusive;
  } else {
    start = indiaDateToUtcRange(ANALYTICS_MIN_DATE).start;
    end = indiaDateToUtcRange(range!.end!).endExclusive;
  }

  if (start > end) {
    throw new AnalyticsRangeError("start must be before or equal to end");
  }

  const spanDays = (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000);
  if (spanDays > ANALYTICS_MAX_RANGE_DAYS) {
    throw new AnalyticsRangeError(
      `date range exceeds maximum of ${ANALYTICS_MAX_RANGE_DAYS} days`
    );
  }

  return { start, end };
}
