"use client";

import * as React from "react";
import { products, type ProductStatus } from "@/products/registry";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const STATUS_VARIANT: Record<ProductStatus, "success" | "accent" | "destructive"> = {
  live: "success",
  beta: "accent",
  killed: "destructive",
};

export default function DirectoryList() {
  const [query, setQuery] = React.useState("");
  const q = query.trim().toLowerCase();
  const filtered = products.filter(
    (p) =>
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.webmcpTools.some((t) => t.toLowerCase().includes(q)),
  );

  const catalog = products.flatMap((p) => p.webmcpTools.map((tool) => ({ tool, product: p.name })));

  React.useEffect(() => {
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "page_view", product: "factory" }),
    }).catch((err) => console.error("[telemetry] directory page_view failed:", err));
  }, []);

  return (
    <div className="space-y-10">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search tools, categories, or WebMCP endpoints…"
        className="h-10 w-full max-w-md rounded border border-border bg-card px-4 py-2 text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      />

      <section>
        <h2 className="mb-3 text-base font-semibold text-foreground">Live tools</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Card key={p.slug} className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-foreground">{p.name}</h3>
                <Badge variant={STATUS_VARIANT[p.status]}>{p.status}</Badge>
              </div>
              <p className="flex-1 text-sm text-subtle">{p.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {p.webmcpTools.map((t) => (
                  <code
                    key={t}
                    className="rounded bg-muted/10 px-1.5 py-0.5 font-mono text-[11px] text-muted"
                  >
                    {t}
                  </code>
                ))}
              </div>
              <a href={p.route} className="text-sm font-medium text-primary hover:underline">
                Open {p.name} →
              </a>
            </Card>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full text-sm text-muted">No tools match “{query}”.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-foreground">WebMCP agent catalog</h2>
        <div className="space-y-1">
          {catalog.map(({ tool, product }) => (
            <div
              key={tool}
              className="flex items-center justify-between gap-3 rounded border border-border bg-card px-3 py-2 text-sm"
            >
              <code className="font-mono text-xs text-foreground">{tool}</code>
              <span className="text-xs text-muted">{product}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
