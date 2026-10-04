import * as React from "react";

/**
 * Editorial Hero Visual Metaphor for FacturGate:
 * Illustrates the deterministic EN 16931 pre-send filter, checksum validator,
 * cent-reconciliation, and compliant Factur-X / UBL emission.
 */
export default function FacturGateSchematic() {
  return (
    <div className="w-full max-w-3xl mx-auto my-4 overflow-hidden rounded-2xl border border-border/80 bg-card p-4 sm:p-6 shadow-2xs">
      <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
          <span className="font-mono text-[11px] font-semibold tracking-wider text-muted uppercase">
            EN 16931 + CIUS-FR Deterministic Pipeline
          </span>
        </div>
        <span className="font-mono text-[11px] text-subtle font-medium">
          Zero Egress • Client-Side Verification
        </span>
      </div>

      <div className="relative w-full">
        <svg
          viewBox="0 0 620 230"
          className="w-full h-auto text-foreground select-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="fgPrismBeam" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4F46E5" />
              <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>
            <linearGradient id="fgPrismFacet" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F8FAFC" />
              <stop offset="100%" stopColor="#E0F2FE" />
            </linearGradient>
            <linearGradient id="fgPrismGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4F46E5" />
              <stop offset="50%" stopColor="#0284C7" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
            <filter id="fgSoftGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#0284C7" floodOpacity="0.15" />
            </filter>
          </defs>

          {/* 1. Incoming Invoice Node */}
          <g transform="translate(10, 85)">
            <rect width="135" height="58" rx="8" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1" />
            <rect x="8" y="8" width="18" height="18" rx="4" fill="#EEF2FF" />
            <text x="17" y="21" fontFamily="monospace" fontSize="10" fill="#4F46E5" fontWeight="bold" textAnchor="middle">
              €
            </text>
            <text x="32" y="20" fontFamily="sans-serif" fontSize="11" fontWeight="bold" fill="#0F172A">
              Invoice Payload
            </text>
            <text x="10" y="38" fontFamily="monospace" fontSize="11" fill="#475569">
              €1,200.00 Gross
            </text>
            <text x="10" y="50" fontFamily="monospace" fontSize="9" fill="#94A3B8">
              FR · CII / UBL / JSON
            </text>
          </g>

          {/* Incoming Beam */}
          <path
            d="M 145 114 L 230 114"
            stroke="url(#fgPrismBeam)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <circle cx="188" cy="114" r="3" fill="#4F46E5" />

          {/* 2. Glassmorphic Verification Gate Prism */}
          <g transform="translate(230, 74)">
            <polygon
              points="24,3 48,38 38,76 10,76 0,38"
              fill="url(#fgPrismFacet)"
              stroke="url(#fgPrismGlow)"
              strokeWidth="1.5"
              filter="url(#fgSoftGlow)"
            />
            <line x1="24" y1="3" x2="24" y2="76" stroke="#4F46E5" strokeWidth="0.75" strokeDasharray="2 2" opacity="0.6" />
            <line x1="0" y1="38" x2="48" y2="38" stroke="#0284C7" strokeWidth="0.75" strokeDasharray="2 2" opacity="0.6" />
            <circle cx="24" cy="38" r="3" fill="#0284C7" />
          </g>

          {/* 3. Fanning Out Thread Lines */}
          {/* Net Sum (#4F46E5) */}
          <path d="M 278 108 C 315 100, 335 26, 380 26" stroke="#4F46E5" strokeWidth="2" fill="none" strokeLinecap="round" />
          {/* Total VAT (#0284C7) */}
          <path d="M 278 112 C 315 110, 335 80, 380 80" stroke="#0284C7" strokeWidth="2" fill="none" strokeLinecap="round" />
          {/* Cent Invariant Delta (#10B981) */}
          <path d="M 278 116 C 315 118, 335 134, 380 134" stroke="#10B981" strokeWidth="2" fill="none" strokeLinecap="round" />
          {/* Emitted Factur-X / UBL Artifact (#0F172A) */}
          <path d="M 278 120 C 315 125, 335 188, 380 188" stroke="#0F172A" strokeWidth="2" fill="none" strokeLinecap="round" />

          {/* 4. Output Node Pills with Micro-Badge Tags */}
          {/* 1. Line Net */}
          <g transform="translate(380, 10)">
            <rect width="230" height="32" rx="6" fill="#FFFFFF" stroke="#4F46E5" strokeWidth="1" strokeOpacity="0.4" />
            <rect x="7" y="8" width="16" height="16" rx="4" fill="#EEF2FF" />
            <text x="15" y="20" fontFamily="sans-serif" fontSize="10" fill="#4F46E5" fontWeight="bold" textAnchor="middle">
              ∑
            </text>
            <text x="30" y="20" fontFamily="sans-serif" fontSize="11" fill="#334155" fontWeight="500">
              Line Net (BT-106)
            </text>
            <text x="218" y="20" fontFamily="monospace" fontSize="11" fill="#4F46E5" fontWeight="bold" textAnchor="end">
              €1,000.00
            </text>
          </g>

          {/* 2. Total VAT */}
          <g transform="translate(380, 64)">
            <rect width="230" height="32" rx="6" fill="#FFFFFF" stroke="#0284C7" strokeWidth="1" strokeOpacity="0.4" />
            <rect x="7" y="8" width="16" height="16" rx="4" fill="#E0F2FE" />
            <text x="15" y="20" fontFamily="sans-serif" fontSize="10" fill="#0284C7" fontWeight="bold" textAnchor="middle">
              %
            </text>
            <text x="30" y="20" fontFamily="sans-serif" fontSize="11" fill="#334155" fontWeight="500">
              VAT (BT-110 · 20%)
            </text>
            <text x="218" y="20" fontFamily="monospace" fontSize="11" fill="#0284C7" fontWeight="bold" textAnchor="end">
              €200.00
            </text>
          </g>

          {/* 3. Cent Invariant Delta */}
          <g transform="translate(380, 118)">
            <rect width="230" height="32" rx="6" fill="#FFFFFF" stroke="#10B981" strokeWidth="1" strokeOpacity="0.4" />
            <rect x="7" y="8" width="16" height="16" rx="4" fill="#DCFCE7" />
            <text x="15" y="20" fontFamily="sans-serif" fontSize="10" fill="#047857" fontWeight="bold" textAnchor="middle">
              ✓
            </text>
            <text x="30" y="20" fontFamily="sans-serif" fontSize="11" fill="#334155" fontWeight="500">
              Recon Variance
            </text>
            <text x="218" y="20" fontFamily="monospace" fontSize="11" fill="#047857" fontWeight="bold" textAnchor="end">
              €0.00
            </text>
          </g>

          {/* 4. Emitted Artifact */}
          <g transform="translate(380, 172)">
            <rect width="230" height="32" rx="6" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1" />
            <rect x="7" y="8" width="16" height="16" rx="4" fill="#E2E8F0" />
            <text x="15" y="20" fontFamily="sans-serif" fontSize="10" fill="#0F172A" fontWeight="bold" textAnchor="middle">
              ⚙
            </text>
            <text x="30" y="20" fontFamily="sans-serif" fontSize="11" fill="#0F172A" fontWeight="bold">
              Factur-X Ready
            </text>
            <text x="218" y="20" fontFamily="sans-serif" fontSize="11" fill="#10B981" fontWeight="bold" textAnchor="end">
              Compliant
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
}
