# SOP: Post-Ship Launch Video (`brag` → ElevenLabs → YouTube)

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
- Do **NOT** pass `--voice`: narration comes from step 4 (ElevenLabs), not Kokoro.
- Music on (default). Keep the video 15–25 s.
- Gate before continuing:
```bash
ffprobe -v error -show_entries format=duration -of json content/launch_videos/<slug>/brag.mp4
test -s content/launch_videos/<slug>/share-copy.txt && echo "share copy OK"
```
If either fails, stop and mark the run failed — do not hand-write a video file.

## 4. Write the narration, then synthesize it
Write `content/launch_videos/<slug>/narration.txt`: 50–65 words (≈21–27 s at 2.4 words/s), first
person, specific to the product, no invented metrics. Then:
```bash
node scripts/launch-video/voiceover.mjs --slug <slug>
```
If it reports the narration is too long, **cut words** and re-run (max 2 rewrites). Do not change
the speaking speed and do not pad the video.

## 5. Final mix
```bash
node scripts/launch-video/mux.mjs --slug <slug>
```
Produces `launch.mp4` (video copied, voice over ducked music).

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
