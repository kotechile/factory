// src/lib/launch-video/craft.test.ts
import { describe, expect, it } from "vitest";
import {
  analyseMotion,
  BEAT_DELTA,
  craftProblems,
  frameDelta,
  MAX_STATIC_FRACTION,
  MAX_STATIC_RUN_SECONDS,
  STATIC_DELTA,
} from "./craft";

const frame = (value: number, size = 9) => new Uint8Array(size).fill(value);

describe("frameDelta", () => {
  it("scores identical frames at zero and a full inversion at 255", () => {
    expect(frameDelta(frame(10), frame(10))).toBe(0);
    expect(frameDelta(frame(0), frame(255))).toBe(255);
  });

  it("averages across the frame rather than summing it", () => {
    // one pixel changed by 90 in a 9-pixel frame = 10/255
    const a = frame(0);
    const b = frame(0);
    b[4] = 90;
    expect(frameDelta(a, b)).toBeCloseTo(10, 5);
  });

  it("refuses frames it cannot compare", () => {
    expect(() => frameDelta(frame(0, 4), frame(0, 9))).toThrowError(/sizes differ/);
    expect(() => frameDelta(new Uint8Array(0), new Uint8Array(0))).toThrowError(/empty frame/);
  });
});

describe("analyseMotion", () => {
  it("calls a film that never changes frozen for its whole runtime", () => {
    const report = analyseMotion([0.2, 0.1, 0.3, 0.2], 2);
    expect(report.seconds).toBe(2);
    expect(report.staticFraction).toBe(1);
    expect(report.longestStaticRunSeconds).toBe(2);
    expect(report.beats).toBe(0);
  });

  it("measures the longest frozen stretch, not the total frozen time", () => {
    // 1 s still, a cut, 2 s still → longest run is 2 s even though 3 s of 4 s is frozen
    const report = analyseMotion([0.4, 0.2, 14, 0.1, 0.1, 0.3, 0.2], 2);
    expect(report.longestStaticRunSeconds).toBeCloseTo(2, 5);
    expect(report.beats).toBe(1);
  });

  it("treats a held beat under the static threshold as static, by design", () => {
    // 0.9/255 is under STATIC_DELTA — a 1.5s hold inside a moving film is craft, which is why the
    // ceiling is 2.5s: the length matters, not the fact that it held.
    const deltas = Array.from({ length: 20 }, (_, index) => {
      if (index >= 7 && index <= 9) return 0.9;
      return index % 6 === 0 ? 10 : 3;
    });
    const report = analyseMotion(deltas, 2);
    expect(report.longestStaticRunSeconds).toBe(1.5);
    expect(craftProblems(report)).toEqual([]);
  });

  it("reports a median that survives one huge outlier", () => {
    const report = analyseMotion([0.5, 0.6, 0.7, 30], 2);
    expect(report.medianDelta).toBeCloseTo(0.65, 5);
    expect(report.maxDelta).toBe(30);
  });

  it("refuses deltas it cannot trust", () => {
    expect(() => analyseMotion([], 2)).toThrowError(/at least one delta/);
    expect(() => analyseMotion([1, -1], 2)).toThrowError(/0-255/);
    expect(() => analyseMotion([1, 2], 0)).toThrowError(/positive sampleFps/);
  });
});

describe("craftProblems — the shipped films' shape", () => {
  // Measured on the five published launch videos: median change 0.46–0.70/255, 56–66% frozen,
  // longest frozen stretch 3.0–4.0s, 4–6 beats in ~21s. All five must fail.
  const shipped = [0.4, 0.3, 0.2, 0.5, 9, 0.2, 0.1, 0.1, 0.1, 10, 0.2, 0.3, 0.2, 0.4, 0.3, 0.2, 11, 0.1];

  it("fails the film the factory shipped", () => {
    const problems = craftProblems(analyseMotion(shipped, 2));
    expect(problems.length).toBeGreaterThanOrEqual(2);
    expect(problems.join(" ")).toMatch(/frozen/);
  });

  it("passes a film that cuts between layouts every couple of seconds", () => {
    // a cut every 1.5s, with a small drift inside each beat — the shape a brag should have
    const healthy = Array.from({ length: 30 }, (_, index) => (index % 3 === 0 ? 12 : 1.8));
    expect(craftProblems(analyseMotion(healthy, 2))).toEqual([]);
  });

  it("fails a film that only holds still, even with a few cuts", () => {
    const sparse = Array.from({ length: 40 }, (_, index) => (index % 20 === 0 ? 9 : 0.3));
    const problems = craftProblems(analyseMotion(sparse, 2));
    expect(problems.join(" ")).toMatch(/frozen|meaningful visual changes/);
  });

  it("has thresholds that are the documented craft standard", () => {
    expect(STATIC_DELTA).toBe(1.0);
    expect(BEAT_DELTA).toBe(8.0);
    expect(MAX_STATIC_RUN_SECONDS).toBe(2.5);
    expect(MAX_STATIC_FRACTION).toBe(0.35);
  });
});
