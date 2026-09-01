import type { Metadata } from "next";
import DirectoryList from "@/components/directory-list";

export const metadata: Metadata = {
  title: "Factory Showcase — Micro-Tool Directory",
  description:
    "Live micro-tools built by the Autonomous Product & Software Factory. Deterministic calculators, each exposing a WebMCP endpoint for agents.",
};

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <header className="mb-8 space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">
          Factory Showcase
        </h1>
        <p className="text-sm text-muted sm:text-base">
          Live micro-tools built by the Autonomous Product &amp; Software Factory. Deterministic
          calculators, every one exposing a WebMCP endpoint for agents.
        </p>
      </header>
      <DirectoryList />
    </main>
  );
}
