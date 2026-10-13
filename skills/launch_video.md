# SOP: Post-Ship Launch Video (`brag` → Kokoro → YouTube)

**Owner:** the `Post-Ship Brag` cron job (model: deepseek-flash).
**Trigger:** the "Post-Ship Brag" job's monitor script reports one or more `PENDING <slug>` lines.
**Hard rules:** factory rule 5 (no silent fallbacks) applies to every step below. A step that fails
is recorded in the ledger as `failed` with the provider's own error text and reported to the founder —
never substituted with a different voice, a different encoder, a lower quality setting, or silence.

## 0. Which product
The monitor diff names the slug. Handle **one slug per run**, oldest first. Skip anything whose
ledger row already says `uploaded` or `grandfathered`.

## 1. Claim the work (always first)
```bash
cd /root/software-factory-core
node scripts/launch-video/record.mjs --slug <slug> --status rendering --bump-attempts
```
This is what makes the run idempotent and what stops a crash from being retried forever
(the detector stops selecting a slug at `attempts >= 3`).

## 2. Read the product — not the repo
The brag video must feel made for THIS product. Read, at minimum:
- `src/products/registry.ts` → the entry for `<slug>` (tagline, description, category, webmcpTools)
- `src/app/<slug>/page.tsx` and any files under `src/lib/calc/<slug>/`, `src/lib/seo/<slug>/`
- the live product: `https://apps.giniloh.com/<slug>/`
Use the product's own words. "Streamline your workflow" is banned (brag skill's creative laws).

## 3. Render the launch video (the brag skill)
Follow the `brag` skill (already loaded in this session) with the working project
`/root/software-factory-core`, scoped to `<slug>`. Requirements:
- Output to `content/launch_videos/<slug>/`. The skill defaults to `brag-output/`; if it writes
  there, move the artifacts: `mv brag-output/* content/launch_videos/<slug>/`.
- Do **NOT** pass `--voice`: the render must stay voice-agnostic (brag skill rule). Narration is
  synthesized separately in step 4 (Kokoro) and mixed in step 5.
- Music on (default), and **derive the bed — do not hand-pick it**:
```bash
node scripts/launch-video/pick-track.mjs --slug <slug> --copy-to content/launch_videos/<slug>/composition
```
  The track is a function of the slug (`src/lib/launch-video/music.ts`), so each product keeps the
  same bed across re-renders while the catalog gets spread across launches — every earlier launch
  was hand-picked onto the same track. Point the composition's music element at the file it prints,
  and take that track's tempo/cues from the brag skill's `assets/music/cues/` before re-checking any
  beat locks. Override only if the derived track genuinely fights the product's tone, and then record
  the reason in `brag-plan.md` — silence is never an override. Keep the video 15–25 s.
- If a bed changes, the extracted audio-reactive data must be re-extracted from the new track;
  carrying the previous track's data over is a silent desync.
- If the brag deliberately has no bed (cues only), say so in `brag-plan.md`; the mux handles it (see
  step 5), but the plan should record that the silence was a decision.
- Gate before continuing:
```bash
ffprobe -v error -show_entries format=duration -of json content/launch_videos/<slug>/brag.mp4
test -s content/launch_videos/<slug>/share-copy.txt && echo "share copy OK"
node scripts/launch-video/check-bed-track.mjs --slug <slug>
```
If any fails, stop and mark the run failed — do not hand-write a video file. `check-bed-track`
proves the composition actually mounted the bed `pick-track` derived; without it the rule is only as
reliable as this instruction being read.

## 4. Write the narration, then synthesize it
Write `content/launch_videos/<slug>/narration.txt`: 40–50 words, first person, specific to the
product, no invented metrics.

**Write short sentences, not comma-lists.** The word count is not the pacing control — clause
structure is. A script that names five things inside one comma-list reads as rushed even when it fits
the budget, and the on-screen cards already name them. Two or three ideas per video, full stops
between them. Measured: 45 words of short sentences at `--speed 0.9` fills 19.0s of a 22.0s video and
reads unhurried; a 22s video with the same information packed into one five-item list did not.

Then, with the render already finished (step 3):
```bash
node scripts/launch-video/voiceover.mjs --slug <slug> --speed 0.9
```
The provider is **Kokoro** (local, via `npx hyperframes tts`) — the voice the `brag` skill itself
documents — and the voice is **derived from the slug** (`src/lib/launch-video/voice.ts`), so the
fleet does not all share one voice. Kokoro needs `kokoro-onnx` + `soundfile`: `HYPERFRAMES_PYTHON` in
`.env` must point at a python that has them (currently `/root/.venvs/kokoro/bin/python`), or the step
fails with "kokoro-onnx is not installed". Override the derived voice with `--voice <id>` only when
it genuinely fights the product's tone, and record the override in `brag-plan.md` — silence is never
an override. `--tts elevenlabs` still runs, for A/B comparison against an older take only; it is no
longer the default and it is not a fallback.

Two checks gate this step. The word budget (`narration.ts`) is the estimate; the **measured** take
length is the real one — a take longer than the video minus 0.5s would be cut off mid-sentence by the
mux's `amix=duration=first`, so the step exits non-zero instead of shipping it. If either fails, cut
words and re-run (max 2 rewrites). Do not pad the video to fit narration.

## 5. Final mix
```bash
node scripts/launch-video/mux.mjs --slug <slug>
```
Produces `launch.mp4` (video copied, voice over the brag's audio). The mux measures how much of the
brag actually carries audio (`silencedetect`) and ducks the brag under the voice **only when there is
a continuous bed to duck** — a cues-only brag keeps its motion-matched effects at full level instead
of being compressed by the same sidechain. If that measurement fails, the run prints a `WARNING` and
falls back to ducking; it never downgrades silently (AGENTS.md rule 5). The mux logs one line naming
which path it took — quote it in the report.

## 6. Upload to YouTube
```bash
node scripts/launch-video/youtube-upload.mjs --slug <slug>
```
Privacy follows `YOUTUBE_PRIVACY_STATUS` (default `private` — a human flips it to public).
A `WARNING: thumbnail …` line is NOT a failure: record it and mention it in the report.

## 7. Record the outcome
```bash
node scripts/launch-video/record.mjs --slug <slug> --status uploaded \
  --video-id <id> --url <url> --words <n> --vo-seconds <s> --video-seconds <s>
```
On any failure: `node scripts/launch-video/record.mjs --slug <slug> --status failed --error "<exact error>"`.

## 8. Report
Your final response IS the Slack post to `#loop-ai`. Follow `skills/slack_reporting.md`, draft it to
`.scratch/brag-<slug>-report.md`, and re-gate it: `node scripts/check-slack-report.mjs <file>` (exit 0)
before delivering. Include the YouTube URL and the privacy state. When there is nothing pending,
reply with nothing at all.

## Retry policy
`attempts` is incremented at step 1. Below 3, a failed slug is retried on a later tick (transient
API errors). At 3, the detector stops selecting it and the founder must be told in the report.
