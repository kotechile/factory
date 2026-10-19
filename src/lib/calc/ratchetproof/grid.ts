/**
 * The aligned interval grid.
 *
 * A site's peak exists only in the SUM of its meters' coincident intervals: meter A peaks at 10:15
 * with 620 kW while meter B sits at 200 kW, so the site's 820 kW exists nowhere in either meter's own
 * data. `align` is the only place that sum is made, and it refuses every input it cannot sum honestly:
 *
 *   • mixed 15/30-minute granularity — a 30-minute kW value cannot be split into two 15-minute values
 *     without inventing the peak the audit exists to find, so the pair is rejected, not downsampled;
 *   • a gap inside a meter's series — never interpolated;
 *   • a slot one meter does not cover — the site total would silently understate it, so the span must
 *     be common to every meter;
 *   • a count that disagrees with what the file declares — Σ(read) must equal Σ(declared).
 *
 * No clock, no network: `align` reads only the timestamps the caller supplies.
 */
import { RatchetProofFieldError } from "./money";
import type {
  AlignedGrid,
  BillingWindowSpec,
  GridSlot,
  MeterSeries,
  Tariff,
} from "./types";

const ISO_TIMESTAMP =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(Z|[+-]\d{2}:\d{2})$/;

/** Parses a timestamp to epoch minutes since 1970-01-01T00:00Z, refusing sub-minute precision. */
export function epochMinuteOf(iso: string, fieldPath: string): number {
  const match = ISO_TIMESTAMP.exec(iso.trim());
  if (!match) {
    throw new RatchetProofFieldError(
      "rp-interval-invalid",
      fieldPath,
      `\`${fieldPath}\` must be an ISO 8601 timestamp with an explicit zone (e.g. 2026-01-14T18:00:00Z); received ${JSON.stringify(iso)}. Nothing was audited.`,
    );
  }
  const [, year, month, day, hour, minute, second, zone] = match;
  if (second !== undefined && Number(second) !== 0) {
    throw new RatchetProofFieldError(
      "rp-interval-invalid",
      fieldPath,
      `\`${fieldPath}\` carries seconds, finer than the interval grid this engine aligns on; received ${JSON.stringify(iso)}. Nothing was audited.`,
    );
  }
  let offsetMinutes = 0;
  if (zone !== "Z") {
    const sign = zone.startsWith("-") ? -1 : 1;
    offsetMinutes = sign * (Number(zone.slice(1, 3)) * 60 + Number(zone.slice(4, 6)));
  }
  const utcMs = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
  );
  const check = new Date(utcMs);
  if (
    check.getUTCFullYear() !== Number(year) ||
    check.getUTCMonth() !== Number(month) - 1 ||
    check.getUTCDate() !== Number(day) ||
    check.getUTCHours() !== Number(hour) ||
    check.getUTCMinutes() !== Number(minute)
  ) {
    throw new RatchetProofFieldError(
      "rp-interval-invalid",
      fieldPath,
      `\`${fieldPath}\` is not a real calendar timestamp; received ${JSON.stringify(iso)}. Nothing was audited.`,
    );
  }
  if (utcMs % 60_000 !== 0) {
    throw new RatchetProofFieldError(
      "rp-interval-invalid",
      fieldPath,
      `\`${fieldPath}\` is not on a whole minute; received ${JSON.stringify(iso)}. Nothing was audited.`,
    );
  }
  return utcMs / 60_000 - offsetMinutes;
}

/** Formats epoch minutes back as `YYYY-MM-DDTHH:MM:00Z`. */
export function isoFromEpochMinute(epochMinute: number): string {
  return `${new Date(epochMinute * 60_000).toISOString().slice(0, 16)}:00Z`;
}

/** `YYYY-MM` for an instant, read on the tariff's declared offset. */
export function monthKeyOf(epochMinute: number, utcOffsetMinutes: number): string {
  const local = new Date((epochMinute + utcOffsetMinutes) * 60_000);
  return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** The month before `month` (`2026-01` → `2025-12`). */
export function previousMonth(month: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) {
    throw new RatchetProofFieldError(
      "rp-history-window",
      "history.month",
      `\`${month}\` is not a YYYY-MM month key. Nothing was audited.`,
    );
  }
  const year = Number(match[1]);
  const monthIndex = Number(match[2]);
  if (monthIndex < 1 || monthIndex > 12) {
    throw new RatchetProofFieldError(
      "rp-history-window",
      "history.month",
      `\`${month}\` is not a calendar month. Nothing was audited.`,
    );
  }
  return monthIndex === 1
    ? `${year - 1}-12`
    : `${year}-${String(monthIndex - 1).padStart(2, "0")}`;
}

/**
 * True when the window covers the instant. A window whose `startMinute` is after its `endMinute`
 * wraps midnight, and the DAY test then belongs to the day the window OPENED (a Friday 22:00–02:00
 * window bills the small hours of Saturday).
 */
export function windowIncludes(
  spec: BillingWindowSpec,
  epochMinute: number,
): boolean {
  const localMinute = epochMinute + spec.utcOffsetMinutes;
  const minuteOfDay = ((localMinute % 1440) + 1440) % 1440;
  // 1970-01-01 was a Thursday (day 4).
  const dayOfWeek =
    (((Math.floor(localMinute / 1440) + 4) % 7) + 7) % 7;
  if (spec.startMinute < spec.endMinute) {
    return (
      spec.days.includes(dayOfWeek) &&
      minuteOfDay >= spec.startMinute &&
      minuteOfDay < spec.endMinute
    );
  }
  // Wrapped window: after the opening minute on a billed day, or before the close on the NEXT day.
  if (minuteOfDay >= spec.startMinute) return spec.days.includes(dayOfWeek);
  if (minuteOfDay < spec.endMinute) return spec.days.includes((dayOfWeek + 6) % 7);
  return false;
}

/** A resolved billing window, or the loud refusal to filter on one that is not stated. */
export interface BillingWindowFilter {
  stated: boolean;
  spec: BillingWindowSpec | null;
  includes(epochMinute: number): boolean;
  describe(): string;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** `billingWindow(tariff)` — the predicate the peak search is restricted to. */
export function billingWindow(tariff: Tariff): BillingWindowFilter {
  const field = tariff.billingWindow;
  if (field.provenance !== "extracted" || field.value === null) {
    return {
      stated: false,
      spec: null,
      includes: () => {
        throw new RatchetProofFieldError(
          "rp-tariff-unstated",
          "tariff.billingWindow",
          `The tariff's billing window is ${field.provenance}, so the engine cannot tell whether an interval sets the billed peak. The verdict is withheld rather than assuming all hours bill. Nothing was audited.`,
        );
      },
      describe: () => `billing window ${field.provenance}`,
    };
  }
  const spec = field.value;
  const days = spec.days.map((day) => DAY_NAMES[day] ?? String(day)).join(", ");
  const clock = (minutes: number) =>
    `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  return {
    stated: true,
    spec,
    includes: (epochMinute: number) => windowIncludes(spec, epochMinute),
    describe: () => `${days} ${clock(spec.startMinute)}–${clock(spec.endMinute)}`,
  };
}

/**
 * Aligns every meter onto ONE grid and sums coincident intervals.
 *
 * The returned slots are contiguous from the first to the last, so "no slot is missing" is a property
 * of the result rather than something every consumer re-checks.
 */
export function align(series: MeterSeries[]): AlignedGrid {
  if (series.length === 0) {
    throw new RatchetProofFieldError(
      "rp-intervals-empty",
      "meters",
      "No interval series was supplied, so there is no peak to audit. Nothing was audited.",
    );
  }

  const granularities = new Set(series.map((meter) => meter.intervalMinutes));
  if (granularities.size > 1) {
    const described = series
      .map((meter) => `${meter.meterId}: ${meter.intervalMinutes} min`)
      .join(", ");
    throw new RatchetProofFieldError(
      "rp-interval-granularity-mixed",
      "meters.intervalMinutes",
      `The meters are recorded on different interval lengths (${described}). A 30-minute demand value cannot be split into two 15-minute values without inventing the peak — re-export every meter at one interval length. Nothing was audited.`,
    );
  }
  const intervalMinutes = series[0].intervalMinutes;
  if (intervalMinutes !== 15 && intervalMinutes !== 30) {
    throw new RatchetProofFieldError(
      "rp-interval-granularity-mixed",
      "meters.intervalMinutes",
      `Interval length must be 15 or 30 minutes; received ${intervalMinutes}. Nothing was audited.`,
    );
  }

  let intervalsRead = 0;
  let intervalsDeclared = 0;
  const bySlot = new Map<number, GridSlot>();

  for (const meter of series) {
    if (!meter.meterId.trim()) {
      throw new RatchetProofFieldError(
        "rp-interval-invalid",
        "meters.meterId",
        "An interval series carries no meter id, so its contribution cannot be attributed. Nothing was audited.",
      );
    }
    intervalsDeclared += meter.declaredIntervalCount;
    intervalsRead += meter.readings.length;
    if (meter.readings.length !== meter.declaredIntervalCount) {
      throw new RatchetProofFieldError(
        "rp-interval-count-mismatch",
        `meters.${meter.meterId}`,
        `Meter ${meter.meterId} declares ${meter.declaredIntervalCount} intervals but ${meter.readings.length} were read. A partial series is refused, never summed: the peak it would produce is not the month's peak. Nothing was audited.`,
      );
    }
    if (meter.readings.length === 0) {
      throw new RatchetProofFieldError(
        "rp-intervals-empty",
        `meters.${meter.meterId}`,
        `Meter ${meter.meterId} has no readings. Nothing was audited.`,
      );
    }

    const ordered = [...meter.readings].sort(
      (a, b) =>
        epochMinuteOf(a.startUtc, `meters.${meter.meterId}.start`) -
        epochMinuteOf(b.startUtc, `meters.${meter.meterId}.start`),
    );

    let previousEpoch: number | null = null;
    for (const reading of ordered) {
      const epoch = epochMinuteOf(reading.startUtc, `meters.${meter.meterId}.start`);
      if (epoch % intervalMinutes !== 0) {
        throw new RatchetProofFieldError(
          "rp-interval-misaligned",
          `meters.${meter.meterId}.${reading.startUtc}`,
          `Meter ${meter.meterId} has an interval starting at ${reading.startUtc}, which is not on the ${intervalMinutes}-minute grid. Re-export the series on the grid the tariff bills on; nothing was audited.`,
        );
      }
      if (!Number.isInteger(reading.kwMilli) || reading.kwMilli < 0) {
        throw new RatchetProofFieldError(
          "rp-interval-invalid",
          `meters.${meter.meterId}.${reading.startUtc}`,
          `Meter ${meter.meterId} has a demand reading of ${reading.kwMilli} at ${reading.startUtc}; demand must be a non-negative integer number of milli-kW. Nothing was audited.`,
        );
      }
      if (previousEpoch !== null) {
        const expected: number = previousEpoch + intervalMinutes;
        if (epoch === previousEpoch) {
          throw new RatchetProofFieldError(
            "rp-interval-overlap",
            `meters.${meter.meterId}.${reading.startUtc}`,
            `Meter ${meter.meterId} has two readings for the interval starting ${reading.startUtc}. A duplicated interval would be counted twice in the site sum; nothing was audited.`,
          );
        }
        if (epoch !== expected) {
          throw new RatchetProofFieldError(
            "rp-interval-gap",
            `meters.${meter.meterId}.${isoFromEpochMinute(expected)}`,
            `Meter ${meter.meterId} is missing the interval starting ${isoFromEpochMinute(expected)} (the next reading is ${reading.startUtc}). A gap is never interpolated: the site peak may be inside it, so nothing was audited.`,
          );
        }
      }
      previousEpoch = epoch;

      const slot = bySlot.get(epoch) ?? {
        startUtc: isoFromEpochMinute(epoch),
        epochMinute: epoch,
        totalKwMilli: 0,
        byMeter: [],
      };
      const existing = slot.byMeter.find((entry) => entry.meterId === meter.meterId);
      if (existing) {
        throw new RatchetProofFieldError(
          "rp-interval-overlap",
          `meters.${meter.meterId}.${reading.startUtc}`,
          `Meter ${meter.meterId} contributes twice to the interval starting ${reading.startUtc}. Nothing was audited.`,
        );
      }
      slot.byMeter.push({ meterId: meter.meterId, kwMilli: reading.kwMilli });
      slot.totalKwMilli += reading.kwMilli;
      bySlot.set(epoch, slot);
    }
  }

  const epochs = [...bySlot.keys()].sort((a, b) => a - b);
  const first = epochs[0];
  const last = epochs[epochs.length - 1];
  const expectedSlots = (last - first) / intervalMinutes + 1;
  if (expectedSlots !== epochs.length) {
    for (let epoch = first; epoch <= last; epoch += intervalMinutes) {
      if (!bySlot.has(epoch)) {
        throw new RatchetProofFieldError(
          "rp-interval-gap",
          `grid.${isoFromEpochMinute(epoch)}`,
          `The aligned grid is missing ${isoFromEpochMinute(epoch)}. Nothing was audited.`,
        );
      }
    }
  }

  const slots: GridSlot[] = epochs.map((epoch) => {
    const slot = bySlot.get(epoch) as GridSlot;
    if (slot.byMeter.length !== series.length) {
      const missing = series
        .map((meter) => meter.meterId)
        .filter((id) => !slot.byMeter.some((entry) => entry.meterId === id));
      throw new RatchetProofFieldError(
        "rp-interval-coverage-gap",
        `grid.${slot.startUtc}`,
        `The interval starting ${slot.startUtc} is not covered by ${missing.join(", ")}. A site total summed over part of its meters understates the peak, so the series are refused until every meter covers the same span. Nothing was audited.`,
      );
    }
    return slot;
  });

  return {
    intervalMinutes,
    slots,
    intervalsRead,
    intervalsDeclared,
    firstSlotUtc: isoFromEpochMinute(first),
    lastSlotUtc: isoFromEpochMinute(last),
  };
}
