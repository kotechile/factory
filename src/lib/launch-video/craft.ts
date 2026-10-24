// src/lib/launch-video/craft.ts
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * "Does the video actually move?" — the measurement behind `scripts/launch-video/check-craft.mjs`.
 *
 * `npx hyperframes check` audits structure, contrast and overlap and has no opinion on motion. Every
 * factory film shipped with two scenes 3.2 s apart measuring 0.95 SSIM (a headline and a card holding
 * still while a table's interior swapped), and no gate noticed. The owner's own `/brag` runs read as
 * films; the factory's read as slides. The difference is motion, so motion is what gets measured.
 *
 * The measure is deliberately dumb and cheap: sample the picture twice a second at 320×180 grayscale
 * and take the mean absolute difference (0-255) between consecutive samples. A cut or a camera move
 * lands far above 8; a held beat sits near 0. Held beats are craft — frozen scenes are not, and the
 * thresholds below are what separates them.
 */

/** Samples per second. Twice a second catches a 1 s cut without a frame-by-frame pass. */
export const SAMPLE_FPS = 2;

/** Grayscale sample size — small enough to be instant, big enough to see a layout change. */
export const SAMPLE_WIDTH = 320;
export const SAMPLE_HEIGHT = 180;

/** Mean absolute difference, 0-255, at or below which two samples are "the same picture". */
export const STATIC_DELTA = 1.0;

/** A change at or above this is a cut, a camera move or a full re-layout. */
export const BEAT_DELTA = 8.0;

/** How long the picture may sit frozen before it reads as a slide rather than a held beat. */
export const MAX_STATIC_RUN_SECONDS = 2.5;

/** What share of the runtime may be frozen before the film reads as static. */
export const MAX_STATIC_FRACTION = 0.35;

export interface CraftReport {
  readonly seconds: number;
  readonly samples: number;
  /** Median frame-to-frame change, 0-255. */
  readonly medianDelta: number;
  readonly maxDelta: number;
  /** Longest run of consecutive samples under STATIC_DELTA, in seconds. */
  readonly longestStaticRunSeconds: number;
  /** Share of samples whose picture matched the previous one. */
  readonly staticFraction: number;
  /** Samples that changed the picture at or above BEAT_DELTA. */
  readonly beats: number;
  /** One entry per sample, for a log line or a chart. */
  readonly trace: readonly { t: number; delta: number }[];
}

/** Mean absolute difference of two equally sized grayscale frames, 0-255. */
export function frameDelta(a: Uint8Array, b: Uint8Array): number {
  if (a.length !== b.length) {
    throw new Error(`frame sizes differ (${a.length} vs ${b.length}) — refusing to compare`);
  }
  if (a.length === 0) throw new Error("empty frame");
  let total = 0;
  for (let index = 0; index < a.length; index += 1) total += Math.abs(a[index] - b[index]);
  return total / a.length;
}

/**
 * The report, from the per-sample deltas alone — so the thresholds and the run-length logic are
 * unit-testable without ffmpeg or a rendered film.
 */
export function analyseMotion(deltas: readonly number[], sampleFps: number = SAMPLE_FPS): CraftReport {
  if (deltas.length === 0) throw new Error("analyseMotion needs at least one delta");
  if (!Number.isFinite(sampleFps) || sampleFps <= 0) {
    throw new Error(`analyseMotion needs a positive sampleFps; received ${sampleFps}`);
  }
  for (const delta of deltas) {
    if (!Number.isFinite(delta) || delta < 0) {
      throw new Error(`analyseMotion got a delta of ${delta} — deltas are 0-255 magnitudes`);
    }
  }

  const sorted = [...deltas].sort((x, y) => x - y);
  const median =
    sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[(sorted.length - 1) / 2];

  let run = 0;
  let longest = 0;
  let frozen = 0;
  let beats = 0;
  for (const delta of deltas) {
    if (delta <= STATIC_DELTA) {
      run += 1;
      frozen += 1;
      if (run > longest) longest = run;
    } else {
      run = 0;
    }
    if (delta >= BEAT_DELTA) beats += 1;
  }

  return {
    seconds: deltas.length / sampleFps,
    samples: deltas.length,
    medianDelta: median,
    maxDelta: sorted[sorted.length - 1],
    longestStaticRunSeconds: longest / sampleFps,
    staticFraction: frozen / deltas.length,
    beats,
    trace: deltas.map((delta, index) => ({ t: index / sampleFps, delta })),
  };
}

/** The reasons a report fails, phrased as what to change rather than as a number. */
export function craftProblems(report: CraftReport): string[] {
  const problems: string[] = [];
  if (report.longestStaticRunSeconds > MAX_STATIC_RUN_SECONDS) {
    problems.push(
      `the picture is frozen for ${report.longestStaticRunSeconds.toFixed(1)}s in one stretch ` +
        `(max ${MAX_STATIC_RUN_SECONDS}s) — that reads as a slide: add motion inside the beat, or cut ` +
        `to the next scene sooner`,
    );
  }
  if (report.staticFraction > MAX_STATIC_FRACTION) {
    problems.push(
      `${Math.round(report.staticFraction * 100)}% of the runtime is frozen ` +
        `(max ${Math.round(MAX_STATIC_FRACTION * 100)}%) — the film holds far more than it moves`,
    );
  }
  if (report.beats === 0) {
    problems.push(
      "no sample changed the picture by 8/255 — nothing in this film reads as a cut or a camera move",
    );
  } else if (report.beats < Math.ceil(report.seconds / 6)) {
    problems.push(
      `only ${report.beats} meaningful visual changes in ${report.seconds.toFixed(1)}s — aim for one ` +
        `every few seconds, not one per scene`,
    );
  }
  return problems;
}

/**
 * Decode a file to grayscale samples and return the frame-to-frame deltas.
 *
 * This is the only part that needs ffmpeg, so it lives here rather than in each caller: the craft
 * CLI and the upload gate must measure the same way, or "it passed locally" means nothing.
 */
export function sampleMotion(file: string): { deltas: number[]; samples: number } {
  const dir = mkdtempSync(join(tmpdir(), "craft-"));
  try {
    const raw = join(dir, "samples.raw");
    execFileSync("ffmpeg", [
      "-v", "error", "-i", file,
      "-vf", `fps=${SAMPLE_FPS},scale=${SAMPLE_WIDTH}:${SAMPLE_HEIGHT},format=gray`,
      "-f", "rawvideo", "-pix_fmt", "gray", raw,
    ]);
    const bytes = new Uint8Array(readFileSync(raw));
    const size = SAMPLE_WIDTH * SAMPLE_HEIGHT;
    if (bytes.length % size !== 0) {
      throw new Error(`${file}: decoded ${bytes.length} bytes, not a multiple of ${size} — bad sample pass`);
    }
    const count = bytes.length / size;
    if (count < 2) throw new Error(`${file} produced ${count} sample(s) — nothing to measure`);
    const deltas: number[] = [];
    for (let index = 1; index < count; index += 1) {
      deltas.push(
        frameDelta(
          bytes.subarray((index - 1) * size, index * size),
          bytes.subarray(index * size, (index + 1) * size),
        ),
      );
    }
    return { deltas, samples: count };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
