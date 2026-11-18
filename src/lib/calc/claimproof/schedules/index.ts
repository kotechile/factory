/**
 * The vendored schedule registry.
 *
 * Add a schedule by vendoring a `<oem>@<version>.ts` file here and appending it below — never by
 * hand-editing an allowance hour, a rate or a cap into the engine. A rule you cannot cite to a primary
 * source is not vendored: code that needs it reports `unstated`.
 */
import type { LabourSchedule } from "../types";
import { ClaimProofFieldError } from "../money";
import { TRUEMFG_2022_06 } from "./truemfg@2022-06";

const SCHEDULES: LabourSchedule[] = [TRUEMFG_2022_06];

/** Every vendored schedule, keyed by slug. Throws on a duplicate slug (an ambiguous registry). */
const BY_SLUG: Record<string, LabourSchedule> = (() => {
  const map: Record<string, LabourSchedule> = {};
  for (const schedule of SCHEDULES) {
    if (map[schedule.slug]) {
      throw new Error(
        `Schedule slug '${schedule.slug}' is claimed by two vendored files; the registry must stay unambiguous.`,
      );
    }
    map[schedule.slug] = schedule;
  }
  return map;
})();

/** The slugs a caller may name — the allowlist for the schedule selector (no silent fallback). */
export const SCHEDULE_SLUGS: readonly string[] = Object.keys(BY_SLUG);

export function scheduleBySlug(slug: string): LabourSchedule {
  const schedule = BY_SLUG[slug];
  if (!schedule) {
    throw new ClaimProofFieldError(
      "cp-schedule-unknown",
      "scheduleSlug",
      `No vendored schedule is registered under '${slug}'. Available schedules: ${SCHEDULE_SLUGS.join(
        ", ",
      )}. Nothing was audited.`,
    );
  }
  return schedule;
}

/** True when the schedule is stale for a claim served on `serviceDate` (a newer revision applies). */
export function isStaleSchedule(schedule: LabourSchedule, serviceDate: string): boolean {
  if (schedule.supersededAfter === null) return false;
  return serviceDate >= schedule.supersededAfter;
}

/** The schedule code list, for the extraction prompt's label normalization. */
export function scheduleRepairCodes(schedule: LabourSchedule): string[] {
  return Object.keys(schedule.rules);
}

export { TRUEMFG_2022_06 };
