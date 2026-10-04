"use client";

import * as React from "react";
import Link from "next/link";
import {
  Search,
  X,
  ArrowRight,
  Terminal,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Zap,
  SlidersHorizontal,
  Code2,
  Copy,
  Check,
  Info,
} from "lucide-react";
import { products, type Product } from "@/products/registry";
import { agentRateOrNull, priceSummary } from "@/products/pricing";
import { trackEvent } from "@/lib/telemetry-client";
import { Modal } from "@/components/ui/modal";

const PUNCHY_SUMMARIES: Record<string, string> = {
  ledgerlink:
    "Decomposes a netted Stripe payout into categorized GL journal lines that sum to the net exactly.",
  facturgate:
    "Pre-send EN 16931 & CIUS-FR compliance gate and Factur-X / UBL converter with cent-exact line reconciliation.",
  parcelproof:
    "Deterministic audit of parcel invoices against shipment records, carrier DIM divisors, and accessorial surcharges.",
  caseproof:
    "Audits vendor warehouse-automation quotes against loaded labor rates, omitted lines, and multi-bid cash models.",
  quarterline:
    "Deterministic 2026 self-employment tax, Section 199A QBI deduction, and safe-harbor estimated-payment calculator.",
};

export default function DirectoryList() {
  const [query, setQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("All");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "retired">("all");
  const [expandedCards, setExpandedCards] = React.useState<Set<string>>(new Set());
  const [activeModalProduct, setActiveModalProduct] = React.useState<Product | null>(null);
  const [copiedTool, setCopiedTool] = React.useState<string | null>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    trackEvent("page_view", undefined, "factory");
  }, []);

  // Keyboard shortcut: Cmd+K or Ctrl+K to focus search input
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const publicProducts = React.useMemo(
    () => products.filter((p) => p.visibility !== "internal"),
    [],
  );

  const categories = React.useMemo(() => {
    const set = new Set(publicProducts.map((p) => p.category));
    return ["All", ...Array.from(set)];
  }, [publicProducts]);

  const q = query.trim().toLowerCase();

  const filteredProducts = React.useMemo(() => {
    return publicProducts.filter((p) => {
      // Category filter
      if (selectedCategory !== "All" && p.category !== selectedCategory) {
        return false;
      }
      // Status filter
      if (statusFilter === "active" && p.status === "killed") {
        return false;
      }
      if (statusFilter === "retired" && p.status !== "killed") {
        return false;
      }
      // Search query
      if (!q) return true;
      const punchy = PUNCHY_SUMMARIES[p.slug] || "";
      const matchesSearch =
        p.name.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        punchy.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.webmcpTools.some((t) => t.toLowerCase().includes(q)) ||
        (priceSummary(p.slug) ?? "").toLowerCase().includes(q);
      return matchesSearch;
    });
  }, [publicProducts, selectedCategory, statusFilter, q]);

  const toggleExpand = (slug: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  };

  const handleCopyTool = (tool: string) => {
    navigator.clipboard.writeText(tool);
    setCopiedTool(tool);
    setTimeout(() => setCopiedTool(null), 1800);
  };

  const catalog = React.useMemo(
    () =>
      publicProducts.flatMap((p) =>
        p.webmcpTools.map((tool) => ({
          tool,
          product: p.name,
          slug: p.slug,
          category: p.category,
          status: p.status,
          route: p.route,
        })),
      ),
    [publicProducts],
  );

  const filteredCatalog = React.useMemo(() => {
    if (!q) return catalog;
    return catalog.filter(
      (c) =>
        c.tool.toLowerCase().includes(q) ||
        c.product.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q),
    );
  }, [catalog, q]);

  const activeCount = publicProducts.filter((p) => p.status !== "killed").length;
  const retiredCount = publicProducts.filter((p) => p.status === "killed").length;

  return (
    <div className="space-y-10">
      {/* Search & Category Filter Section */}
      <section aria-label="Tool filtering and search" className="space-y-4">
        {/* Top Controls Row: Category Chips and Lifecycle Status Filter */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Category Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              const count =
                cat === "All"
                  ? publicProducts.length
                  : publicProducts.filter((p) => p.category === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    isSelected
                      ? "bg-primary text-card shadow-xs font-semibold"
                      : "bg-card border border-border/80 text-muted hover:text-foreground hover:bg-black/[0.02]"
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 font-mono text-[10px] ${
                      isSelected
                        ? "bg-white/20 text-card"
                        : "bg-background text-muted"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Status Segmented Filter */}
          <div className="flex items-center gap-1 rounded-xl border border-border/80 bg-background p-1 text-xs self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`rounded-lg px-2.5 py-1 font-medium transition-all ${
                statusFilter === "all"
                  ? "bg-card text-foreground font-semibold shadow-2xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              All ({publicProducts.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={`rounded-lg px-2.5 py-1 font-medium transition-all ${
                statusFilter === "active"
                  ? "bg-card text-foreground font-semibold shadow-2xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("retired")}
              className={`rounded-lg px-2.5 py-1 font-medium transition-all ${
                statusFilter === "retired"
                  ? "bg-card text-foreground font-semibold shadow-2xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Retired ({retiredCount})
            </button>
          </div>
        </div>

        {/* Elevated Search Bar */}
        <div className="relative">
          <label htmlFor="showcase-search" className="sr-only">
            Search tools, categories, or WebMCP endpoints
          </label>
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
            <Search className="h-4 w-4" />
          </div>
          <input
            id="showcase-search"
            ref={searchInputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tools, categories, or WebMCP endpoints..."
            className="h-11 w-full rounded-xl border border-border/90 bg-card pl-10 pr-24 text-sm text-foreground placeholder:text-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent transition-all shadow-2xs"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 gap-1.5">
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search input"
                className="rounded-md p-1 text-muted hover:text-foreground hover:bg-black/[0.05] transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted">
              <span>⌘</span>K
            </kbd>
          </div>
        </div>
      </section>

      {/* Applications Grid */}
      <section aria-label="Available tools directory">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">
              Applications &amp; Utilities
            </h2>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
              {filteredProducts.length}
            </span>
          </div>
          {query && (
            <span className="text-xs text-muted">
              Filtered by: &ldquo;{query}&rdquo;
            </span>
          )}
        </div>

        {/* Empty state */}
        {filteredProducts.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <SlidersHorizontal className="mx-auto h-8 w-8 text-muted/60 mb-3" />
            <h3 className="text-sm font-semibold text-foreground">No applications found</h3>
            <p className="mt-1 text-xs text-muted max-w-sm mx-auto">
              No tools matched your current filters or query &ldquo;{query}&rdquo;.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSelectedCategory("All");
                setStatusFilter("all");
              }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-black/[0.03]"
            >
              Reset all filters
            </button>
          </div>
        )}

        {/* Product Cards */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((p) => {
            const isKilled = p.status === "killed";
            const isBeta = p.status === "beta";
            const isLive = p.status === "live";
            const punchySummary = PUNCHY_SUMMARIES[p.slug] || p.description.split(". ")[0] + ".";
            const isExpanded = expandedCards.has(p.slug);
            const pricing = priceSummary(p.slug);

            return (
              <div
                key={p.slug}
                className={`relative flex flex-col justify-between rounded-2xl transition-all duration-200 ${
                  isKilled
                    ? "bg-card/70 border border-dashed border-border/80 shadow-2xs opacity-85 hover:opacity-100"
                    : "bg-card shadow-[0_0_0_1px_rgba(15,23,42,0.06),0_8px_24px_-4px_rgba(15,23,42,0.04)] hover:shadow-[0_0_0_1px_rgba(15,23,42,0.1),0_12px_28px_-4px_rgba(15,23,42,0.08)] hover:-translate-y-0.5"
                }`}
              >
                {/* Card Content Top */}
                <div className="p-5 sm:p-6 space-y-4">
                  {/* Category & Status Row */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted">
                      {p.category}
                    </span>

                    {/* Distinct Lifecycle Badging */}
                    {isLive && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#10B981]/15 border border-[#10B981]/30 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#065F46]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#065F46] animate-pulse" />
                        LIVE
                      </span>
                    )}
                    {isBeta && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#0284C7]/15 border border-[#0284C7]/30 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#075985]">
                        BETA
                      </span>
                    )}
                    {isKilled && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted/10 border border-border px-2.5 py-0.5 font-mono text-[11px] font-semibold text-foreground">
                        RETIRED
                      </span>
                    )}
                  </div>

                  {/* Title & Tagline */}
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold tracking-tight text-foreground flex items-center justify-between">
                      <span>{p.name}</span>
                    </h3>
                    <p className="text-xs font-medium text-muted">
                      {p.tagline}
                    </p>
                  </div>

                  {/* Punchy 1-Sentence Summary */}
                  <p className="text-xs sm:text-sm text-[#334155] leading-relaxed line-clamp-3">
                    {punchySummary}
                  </p>

                  {/* Meta Specs Line: Tools Count & Pricing */}
                  <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-border/60 text-xs">
                    <div className="inline-flex items-center gap-1 font-mono text-[11px] text-muted">
                      <Terminal className="h-3 w-3 text-primary" />
                      <span>{p.webmcpTools.length} WebMCP {p.webmcpTools.length === 1 ? "tool" : "tools"}</span>
                    </div>
                    {pricing && (
                      <div className="inline-flex items-center gap-1 text-[11px] text-muted">
                        <Zap className="h-3 w-3 text-[#0284C7]" />
                        <span>{pricing}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Primary Action Button & Accordion Toggle */}
                <div className="px-5 pb-5 sm:px-6 sm:pb-6 space-y-2">
                  <div className="flex items-center gap-2">
                    {/* Streamlined Primary Action CTA */}
                    <Link
                      href={p.route}
                      className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl text-xs sm:text-sm font-semibold py-2.5 px-4 transition-all duration-150 ${
                        isKilled
                          ? "border border-border/80 bg-background text-muted hover:text-foreground hover:bg-black/[0.03]"
                          : "bg-primary text-card shadow-[0_2px_8px_rgba(79,70,229,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_4px_12px_rgba(79,70,229,0.4),inset_0_1px_0_rgba(255,255,255,0.25)] hover:-translate-y-0.5 active:translate-y-0"
                      }`}
                    >
                      <span>{isKilled ? "View Retired Tool" : "Launch App"}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>

                    {/* Accordion Expand/Collapse Specs Button */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(p.slug)}
                      aria-expanded={isExpanded}
                      aria-controls={`specs-${p.slug}`}
                      className="inline-flex items-center gap-1 rounded-xl border border-border/80 bg-background px-3 py-2.5 text-xs font-medium text-muted hover:text-foreground hover:bg-black/[0.02] transition-colors"
                      title="Toggle API details & full specification"
                    >
                      <span>Specs</span>
                      {isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expandable Technical Details Drawer */}
                {isExpanded && (
                  <div
                    id={`specs-${p.slug}`}
                    className="border-t border-border/80 bg-background/90 p-5 rounded-b-2xl space-y-3.5 animate-in fade-in duration-150"
                  >
                    <div>
                      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
                        Technical Scope &amp; Architecture
                      </h4>
                      <p className="text-xs text-[#334155] leading-relaxed">
                        {p.description}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-[11px] font-semibold text-muted">
                          Registered WebMCP Methods
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveModalProduct(p)}
                          className="inline-flex items-center gap-1 font-mono text-[11px] text-primary hover:underline"
                        >
                          <Info className="h-3 w-3" />
                          <span>View Full Spec</span>
                        </button>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        {p.webmcpTools.map((t) => {
                          const rate = agentRateOrNull(t);
                          return (
                            <div
                              key={t}
                              className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-card px-2.5 py-1.5 text-xs font-mono"
                            >
                              <code className="text-foreground text-[11px] truncate">
                                {t}
                              </code>
                              <div className="flex items-center gap-2 shrink-0">
                                {rate !== null ? (
                                  <span className="text-[10px] font-semibold text-primary">
                                    ${rate.toFixed(2)}/call
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-muted">
                                    browser-only
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleCopyTool(t)}
                                  className="text-muted hover:text-foreground p-0.5"
                                  aria-label={`Copy method name ${t}`}
                                >
                                  {copiedTool === t ? (
                                    <Check className="h-3 w-3 text-[#047857]" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-border/60 text-[11px] text-muted">
                      <span className="inline-flex items-center gap-1 font-mono">
                        <ShieldCheck className="h-3.5 w-3.5 text-[#047857]" />
                        <span>Client-side · Zero egress</span>
                      </span>
                      <span className="font-mono text-[10px]">
                        Route: {p.route}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* WebMCP Agent Catalog Section */}
      <section aria-label="WebMCP agent callable endpoints" className="space-y-4 pt-6 border-t border-border/70">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">
                WebMCP Agent Endpoint Catalog
              </h2>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
                {catalog.length} callable tools
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Automated tools exposed via <code className="text-[11px] font-mono text-foreground">navigator.modelContext.registerTool</code> for AI agent runtimes.
            </p>
          </div>
          <Link
            href="/.well-known/mcp.json"
            target="_blank"
            className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-border/80 bg-card px-3 py-1.5 font-mono text-xs text-muted hover:text-foreground hover:bg-black/[0.02] transition-colors shadow-2xs"
          >
            <Code2 className="h-3.5 w-3.5 text-primary" />
            <span>Open MCP Schema</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card shadow-2xs overflow-hidden">
          <div className="divide-y divide-border/60">
            {filteredCatalog.map(({ tool, product, category, status, route }) => {
              const rate = agentRateOrNull(tool);
              return (
                <div
                  key={tool}
                  className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 hover:bg-black/[0.015] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <code className="rounded bg-background border border-border/80 px-2 py-1 font-mono text-xs font-semibold text-foreground">
                      {tool}
                    </code>
                    <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary">
                      {category}
                    </span>
                    {status === "killed" && (
                      <span className="rounded bg-muted/10 border border-border/80 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground">
                        retired
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 text-xs">
                    <Link
                      href={route}
                      className="font-medium text-muted hover:text-foreground hover:underline"
                    >
                      {product}
                    </Link>

                    {rate !== null ? (
                      <span className="rounded-md bg-background border border-border/80 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
                        ${rate.toFixed(2)}/call
                      </span>
                    ) : (
                      <span className="font-mono text-xs text-muted">
                        browser-free
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleCopyTool(tool)}
                      className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-background px-2 py-1 text-[11px] font-medium text-muted hover:text-foreground transition-colors"
                      title="Copy endpoint name"
                    >
                      {copiedTool === tool ? (
                        <>
                          <Check className="h-3 w-3 text-[#047857]" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Detail Modal for Extended Specifications */}
      {activeModalProduct && (
        <Modal
          isOpen={Boolean(activeModalProduct)}
          onClose={() => setActiveModalProduct(null)}
          title={activeModalProduct.name}
          description={activeModalProduct.tagline}
        >
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                Full Description
              </h4>
              <p className="text-xs sm:text-sm text-[#334155] leading-relaxed">
                {activeModalProduct.description}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                Registered WebMCP Tools &amp; Methods
              </h4>
              <div className="space-y-2">
                {activeModalProduct.webmcpTools.map((t) => {
                  const rate = agentRateOrNull(t);
                  return (
                    <div
                      key={t}
                      className="flex items-center justify-between rounded-lg border border-border bg-background p-2.5"
                    >
                      <div>
                        <code className="font-mono text-xs font-semibold text-foreground">
                          {t}
                        </code>
                        <p className="text-[11px] text-muted mt-0.5">
                          Exposed through navigator.modelContext
                        </p>
                      </div>
                      <div className="text-right">
                        {rate !== null ? (
                          <span className="font-mono text-xs font-bold text-primary">
                            ${rate.toFixed(2)} / call
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-muted">
                            Free (Browser)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between">
              <span className="text-xs font-mono text-muted">
                Category: {activeModalProduct.category} • Status: {activeModalProduct.status}
              </span>
              <Link
                href={activeModalProduct.route}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-card hover:opacity-90"
              >
                <span>Open Application</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
