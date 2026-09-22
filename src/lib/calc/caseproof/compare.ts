/**
 * Two or three bids on one cash model (PRD §2 `compare.ts`).
 *
 * Returns the NPV ranking at the buyer's hurdle rate, the cost per order / per line for each bid,
 * the point at which the ranking flips as an axis moves, and the PRD §5 sensitivity grid
 * (volume −10/−20/−30%, capex +15%, maintenance +25%).
 *
 * A crossing is only reported when the two NPV curves actually change places inside a defensible
 * bracket; otherwise the crossing comes back `null` with a stated reason. Guessing a crossing point
 * would be the same failure as guessing a cost line.
 */
import type {
  Baseline,
  BidComparison,
  BidOption,
  Crossing,
  Finance,
  OptionResult,
  SensitivityCell,
} from "./types";
import { bisect, roundAxis, roundCents } from "./money";
import { computeOption } from "./cashflow";

interface ComparisonInput {
  baseline: Baseline;
  finance: Finance;
  options: BidOption[];
}

/** An axis the ranking can be swept along. `apply` rebuilds the case at a point on that axis. */
interface Axis {
  key: Crossing["axis"];
  label: string;
  /** The value the crossing is expressed in (the axis usually sweeps "extra" units). */
  apply: (value: number, context: ComparisonInput) => ComparisonInput;
  bracket: () => [number, number];
  describe: (value: number) => string;
}

function equipmentBasisCents(option: BidOption): number {
  return (option.capex?.equipmentCents ?? 0) + (option.capex?.installCents ?? 0) + (option.capex?.freightCents ?? 0);
}

const AXES: Axis[] = [
  {
    key: "peakFactor",
    label: "peak-season premium",
    apply: (value, context) => ({ ...context, baseline: { ...context.baseline, peakFactor: value } }),
    bracket: () => [1, 5],
    describe: (value) => `${((value - 1) * 100).toFixed(1)}% seasonal premium (volume multiple ${value.toFixed(3)})`,
  },
  {
    key: "maintenancePctOfCapex",
    label: "extra maintenance",
    apply: (value, context) => ({
      ...context,
      options: context.options.map((option) => {
        const extra = roundCents(equipmentBasisCents(option) * (value / 100));
        return option.maintenanceAnnualCents !== undefined
          ? { ...option, maintenanceAnnualCents: option.maintenanceAnnualCents + extra }
          : { ...option, maintenancePctOfCapex: (option.maintenancePctOfCapex ?? 0) + value };
      }),
    }),
    bracket: () => [0, 40],
    describe: (value) => `an extra ${value.toFixed(2)}% of equipment cost per year in maintenance`,
  },
  {
    key: "hurdleRatePct",
    label: "hurdle rate",
    apply: (value, context) => ({ ...context, finance: { ...context.finance, hurdleRatePct: value } }),
    bracket: () => [0, 60],
    describe: (value) => `a ${value.toFixed(2)}% hurdle rate`,
  },
];

function npvOf(context: ComparisonInput, optionIndex: number): number {
  const option = context.options[optionIndex];
  if (!option) return Number.NaN;
  return computeOption({ baseline: context.baseline, finance: context.finance, option }).npvCents;
}

export function compareBids(input: ComparisonInput): BidComparison {
  const results: OptionResult[] = input.options.map((option) =>
    computeOption({ baseline: input.baseline, finance: input.finance, option }),
  );

  const ordered = [...results].sort((a, b) => b.npvCents - a.npvCents);
  const ranking = ordered.map((result, index) => ({
    id: result.id,
    vendor: result.vendor,
    npvCents: result.npvCents,
    costPerOrderCents: result.costPerOrderCents,
    rank: index + 1,
  }));

  const notes: string[] = [];
  const crossings: Crossing[] = [];

  if (input.options.length < 2) {
    notes.push("One bid in the case: there is nothing to compare. Add a second bid to see the crossing points.");
  }

  for (let first = 0; first < input.options.length; first += 1) {
    for (let second = first + 1; second < input.options.length; second += 1) {
      for (const axis of AXES) {
        if (axis.key === "peakFactor" && !input.options.some((option) => option.raas)) {
          // The peak axis only moves a per-unit subscription; with no RaaS bid it prices nothing.
          continue;
        }
        if (axis.key === "peakFactor" && input.baseline.peakFactor === undefined) {
          continue;
        }
        const [low, high] = axis.bracket();
        const delta = (value: number) => {
          const context = axis.apply(value, input);
          return npvOf(context, first) - npvOf(context, second);
        };
        const solved = bisect(delta, low, high);
        const pair: [string, string] = [
          input.options[first]!.id,
          input.options[second]!.id,
        ];
        if (solved === null) {
          notes.push(
            `No ${axis.label} crossing between '${pair[0]}' and '${pair[1]}' inside ${low}–${high}: one bid leads across the whole range, or the two never change places.`,
          );
          continue;
        }
        const value = roundAxis(solved, axis.key === "peakFactor" ? 4 : 3);
        const below = delta(value - (high - low) / 1000) >= 0 ? pair[0] : pair[1];
        crossings.push({
          pair,
          axis: axis.key,
          label: axis.label,
          value,
          leaderBelow: below,
          statement: `'${below}' leads until ${axis.describe(value)}; beyond it the other bid leads.`,
        });
      }
    }
  }

  const sensitivity = buildSensitivity(input);

  if (sensitivity.some((cell) => cell.changedLeader)) {
    notes.push(
      "At least one scenario in the grid flips the ranking — the bid that wins on the base case is not the bid that wins on the sensitivity cases. Read the grid before ranking.",
    );
  }

  return { results, ranking, crossings, sensitivity, notes };
}

/** PRD §5: volume −10/−20/−30%, capex +15%, maintenance +25%. */
function buildSensitivity(input: ComparisonInput): SensitivityCell[] {
  const baseRanking = [...input.options]
    .map((option, index) => ({
      index,
      id: option.id,
      npv: computeOption({ baseline: input.baseline, finance: input.finance, option }).npvCents,
    }))
    .sort((a, b) => b.npv - a.npv)
    .map((entry) => entry.id);

  const cells: SensitivityCell[] = [];
  const scenarios: { axis: SensitivityCell["axis"]; label: string; deltaPct: number; apply: (context: ComparisonInput) => ComparisonInput }[] = [];

  for (const deltaPct of [-10, -20, -30]) {
    scenarios.push({
      axis: "volume",
      label: `Volume ${deltaPct}%`,
      deltaPct,
      apply: (context) => ({
        ...context,
        baseline: {
          ...context.baseline,
          ordersPerDay: context.baseline.ordersPerDay * (1 + deltaPct / 100),
        },
      }),
    });
  }
  scenarios.push({
    axis: "capex",
    label: "Capex +15%",
    deltaPct: 15,
    apply: (context) => ({
      ...context,
      options: context.options.map((option) =>
        option.capex
          ? {
              ...option,
              capex: {
                ...option.capex,
                equipmentCents: roundCents(option.capex.equipmentCents * 1.15),
                installCents: roundCents((option.capex.installCents ?? 0) * 1.15),
                freightCents: roundCents((option.capex.freightCents ?? 0) * 1.15),
              },
            }
          : option,
      ),
    }),
  });
  scenarios.push({
    axis: "maintenance",
    label: "Maintenance +25%",
    deltaPct: 25,
    apply: (context) => ({
      ...context,
      options: context.options.map((option) =>
        option.maintenanceAnnualCents !== undefined
          ? { ...option, maintenanceAnnualCents: roundCents(option.maintenanceAnnualCents * 1.25) }
          : { ...option, maintenancePctOfCapex: (option.maintenancePctOfCapex ?? 0) * 1.25 },
      ),
    }),
  });

  for (const scenario of scenarios) {
    const context = scenario.apply(input);
    const values = context.options.map((option) => ({
      id: option.id,
      npvCents: computeOption({ baseline: context.baseline, finance: context.finance, option }).npvCents,
    }));
    const ranking = [...values].sort((a, b) => b.npvCents - a.npvCents).map((entry) => entry.id);
    cells.push({
      axis: scenario.axis,
      label: scenario.label,
      deltaPct: scenario.deltaPct,
      npvByOptionCents: values,
      ranking,
      changedLeader: ranking[0] !== baseRanking[0],
    });
  }

  return cells;
}
