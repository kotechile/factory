// src/lib/launch-video/narration.ts
/** Deliberate reading pace for a launch video's voiceover (~144 wpm). */
export const WORDS_PER_SECOND = 2.4;
/** The voiceover must end this long before the video's last frame. */
export const TAIL_MARGIN_SECONDS = 0.5;

export function countWords(text: string): number {
  const cleaned = text.replace(/[—–]/g, " ").trim();
  return cleaned ? cleaned.split(/\s+/).length : 0;
}

export function narrationSeconds(words: number): number {
  return words / WORDS_PER_SECOND;
}

export function maxWordsFor(videoSeconds: number, margin = TAIL_MARGIN_SECONDS): number {
  return Math.floor(Math.max(0, videoSeconds - margin) * WORDS_PER_SECOND);
}

/** Throws (never truncates) when the narration overruns the video. */
export function assertNarrationFits(args: {
  words: number;
  videoSeconds: number;
  margin?: number;
}): void {
  const { words, videoSeconds, margin = TAIL_MARGIN_SECONDS } = args;
  const spoken = narrationSeconds(words);
  if (spoken > videoSeconds - margin) {
    throw new Error(
      `narration is ${spoken.toFixed(1)}s but the video is ${videoSeconds.toFixed(1)}s: ` +
        `cut it to <=${maxWordsFor(videoSeconds, margin)} words (${words} words now), ` +
        `then re-run this step — do not speed the voice or pad the video`,
    );
  }
}
