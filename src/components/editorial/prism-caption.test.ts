import { describe, it, expect } from "vitest";
import { CAPTION_MAX_CHARS, wrapCaption } from "./prism-caption";

/**
 * The width contract the hero schematic depends on: no wrapped line may exceed the payload card's usable
 * width, or the caption spills into the dashed beam leaving that card (the CaseProof defect of
 * 2026-10-05, caught by the vision gate reviewing full-resolution tiles).
 */
describe("schematic caption wrap", () => {
  it("keeps the real captions inside the card budget", () => {
    // The two captions the shipped callers pass (CaseProof is the one that overflowed at 26 chars).
    for (const caption of ["vendor lines, buyer basis", "lines + shipment CSV"]) {
      const lines = wrapCaption(caption);
      for (const line of lines) {
        expect(line.length, `"${line}" from "${caption}" exceeds ${CAPTION_MAX_CHARS} chars`).toBeLessThanOrEqual(
          CAPTION_MAX_CHARS,
        );
      }
      expect(lines.length).toBeGreaterThan(0);
      expect(lines.length).toBeLessThanOrEqual(2);
    }
  });

  it("wraps the CaseProof caption onto two lines without losing a word", () => {
    expect(wrapCaption("vendor lines, buyer basis")).toEqual(["vendor lines, buyer", "basis"]);
  });

  it("leaves a caption that already fits on one line", () => {
    expect(wrapCaption("lines + shipment CSV")).toEqual(["lines + shipment CSV"]);
  });

  it("hard-splits a single token longer than a line", () => {
    const lines = wrapCaption("supercalifragilisticexpialidocious");
    expect(lines.length).toBeLessThanOrEqual(2);
    for (const line of lines) expect(line.length).toBeLessThanOrEqual(CAPTION_MAX_CHARS);
  });

  it("ellipsises when the text cannot fit in two lines, and still respects the budget", () => {
    const lines = wrapCaption("alpha beta gamma delta epsilon zeta eta theta iota kappa", 10, 2);
    expect(lines.length).toBe(2);
    for (const line of lines) expect(line.length).toBeLessThanOrEqual(10);
    expect(lines[1].endsWith("…")).toBe(true);
  });

  it("returns nothing for an empty caption rather than an empty line", () => {
    expect(wrapCaption("   ")).toEqual([]);
  });
});
