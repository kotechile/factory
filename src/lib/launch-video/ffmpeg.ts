// src/lib/launch-video/ffmpeg.ts
export const DUCK_FILTER =
  "[0:a]volume=1.0[music];[1:a]volume=1.9,asplit=2[vo][vokey];[vokey]volume=1.0[voside];" +
  "[music][voside]sidechaincompress=threshold=0.05:ratio=8:attack=5:release=350[ducked];" +
  "[ducked][vo]amix=inputs=2:duration=first:dropout_transition=0:weights=1 1[aout]";

export function buildMuxArgs(args: {
  video: string;
  voiceover: string;
  output: string;
  hasMusic: boolean;
}): string[] {
  const { video, voiceover, output, hasMusic } = args;
  const tail = ["-movflags", "+faststart", "-shortest", output];
  if (!hasMusic) {
    return [
      "-y", "-i", video, "-i", voiceover,
      "-map", "0:v:0", "-map", "1:a:0",
      "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
      ...tail,
    ];
  }
  return [
    "-y", "-i", video, "-i", voiceover,
    "-filter_complex", DUCK_FILTER,
    "-map", "0:v:0", "-map", "[aout]",
    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
    ...tail,
  ];
}

export function parseFfprobeDuration(json: { format?: { duration?: string } }): number {
  const raw = json?.format?.duration;
  if (raw === undefined || raw === null || raw === "") {
    throw new Error("ffprobe returned no format.duration — refusing to guess a media length");
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`ffprobe duration is not a number: ${raw}`);
  return value;
}
