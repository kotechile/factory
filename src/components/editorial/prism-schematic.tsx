import * as React from "react";

/**
 * §3.3 — "The Transformation Schematic", generalized from LedgerLink's DisaggregationPrism.
 *
 * Each product supplies its own metaphor (payload in, deterministic transform, categorized outputs)
 * but the geometry, the glassmorphic prism and the balancing-net bar are shared, so the hero artwork
 * cannot quietly become "bare text in a void" on one product and not another.
 *
 * Mathematical fidelity: the caller passes the output node VALUES and the schematic computes the net
 * as their exact sum — the diagram can never advertise a total that disagrees with its own nodes.
 */
export interface PrismNode {
  label: string;
  /** Exact value in the caller's own unit (dollars, lines, checks). Rendered verbatim. */
  value: string;
  /** Numeric value used for the net sum, when the node carries an amount. */
  amount?: number;
  color: string;
}

export function PrismSchematic({
  kicker,
  inputLabel,
  inputDetail,
  transformLabel,
  nodes,
  netLabel,
  unit = "$",
  netValue,
  footnote,
}: {
  /** Small monospaced caption above the diagram frame. */
  kicker: string;
  inputLabel: string;
  inputDetail: string;
  transformLabel: string;
  nodes: PrismNode[];
  netLabel: string;
  unit?: string;
  /**
   * The net line, when it is NOT the sum of the nodes. Use for pipelines whose outputs are stages or
   * invariants rather than amounts — never to print a total the engine did not compute.
   */
  netValue?: string;
  footnote?: string;
}) {
  const amounts = nodes.map((node) => node.amount).filter((value): value is number => typeof value === "number");
  const netIsExact = amounts.length === nodes.length && nodes.length > 0;
  const net = amounts.reduce((total, value) => total + value, 0);

  const rowHeight = 52;
  const top = 34;
  const height = top + nodes.length * rowHeight + 62;

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border/80 bg-card p-4 shadow-2xs sm:p-6">
      <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
          <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted">
            {kicker}
          </span>
        </div>
        <span className="hidden font-mono text-[11px] font-medium text-subtle sm:inline">
          Deterministic • Client-Side
        </span>
      </div>

      <svg
        viewBox={`0 0 620 ${height}`}
        className="h-auto w-full select-none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={`${inputLabel} passing through ${transformLabel} into ${nodes.length} deterministically computed output nodes`}
      >
        <defs>
          <linearGradient id="prismBeam" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>
          <linearGradient id="prismFacet" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F8FAFC" />
            <stop offset="100%" stopColor="#E0F2FE" />
          </linearGradient>
        </defs>

        {/* Incoming payload */}
        <g>
          <rect x="18" y={top + 6} width="146" height={Math.min(84, nodes.length * rowHeight - 6)} rx="10" fill="#F1F5F9" stroke="#CBD5E1" />
          <text x="34" y={top + 32} className="fill-[#0F172A]" fontSize="11" fontFamily="ui-monospace, monospace" fontWeight="600">
            {inputLabel}
          </text>
          <text x="34" y={top + 50} className="fill-[#475569]" fontSize="9.5" fontFamily="ui-monospace, monospace">
            {inputDetail}
          </text>
        </g>

        {/* Beam into the prism */}
        <path d={`M164 ${top + 44} L236 ${height / 2}`} stroke="url(#prismBeam)" strokeWidth="2" fill="none" strokeDasharray="5 4" opacity="0.85" />

        {/* The prism */}
        <g>
          <path d={`M250 ${height / 2 - 42} L296 ${height / 2 + 38} L204 ${height / 2 + 38} Z`} fill="url(#prismFacet)" stroke="#0284C7" strokeWidth="1.4" />
          <path d={`M250 ${height / 2 - 42} L250 ${height / 2 + 38}`} stroke="#94A3B8" strokeWidth="0.7" opacity="0.7" />
          <text x="250" y={height / 2 + 58} textAnchor="middle" className="fill-[#475569]" fontSize="9" fontFamily="ui-monospace, monospace" fontWeight="600">
            {transformLabel}
          </text>
        </g>

        {/* Fan-out threads + output nodes. Label and value stack in ONE left-aligned column: a
            right-aligned value and a long label collide on the same baseline, which is the
            "overlapping text" defect the vision gate flags. */}
        {nodes.map((node, index) => {
          const y = top + index * rowHeight + 22;
          return (
            <g key={node.label}>
              <path
                d={`M296 ${height / 2} C 360 ${height / 2}, 360 ${y}, 424 ${y}`}
                stroke={node.color}
                strokeWidth="1.6"
                fill="none"
                opacity="0.9"
              />
              <circle cx="424" cy={y} r="3" fill={node.color} />
              <text x="436" y={y - 3} className="fill-[#0F172A]" fontSize="10.5" fontFamily="ui-monospace, monospace" fontWeight="600">
                {node.label}
              </text>
              <text x="436" y={y + 11} className="fill-[#475569]" fontSize="9.5" fontFamily="ui-monospace, monospace">
                {node.value}
              </text>
            </g>
          );
        })}

        {/* Balancing net / invariant */}
        <g>
          <line x1="436" y1={top + nodes.length * rowHeight + 4} x2="610" y2={top + nodes.length * rowHeight + 4} stroke="#CBD5E1" strokeWidth="1" />
          <text x="436" y={top + nodes.length * rowHeight + 22} className="fill-[#0F172A]" fontSize="10.5" fontFamily="ui-monospace, monospace" fontWeight="700">
            {netLabel}
          </text>
          <text x="436" y={top + nodes.length * rowHeight + 36} className="fill-[#047857]" fontSize="10.5" fontFamily="ui-monospace, monospace" fontWeight="700">
            {netValue ?? (netIsExact ? `${unit}${net.toFixed(2)}` : "—")}
          </text>
        </g>
      </svg>

      {footnote ? (
        <p className="mt-3 border-t border-border/60 pt-3 font-mono text-[11px] leading-relaxed text-subtle">
          {footnote}
        </p>
      ) : null}
    </div>
  );
}
