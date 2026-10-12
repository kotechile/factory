# Post-ship launch video pipeline (`brag` → ElevenLabs → YouTube)

Node ESM scripts, run from the repo root (`cd /root/software-factory-core`). Shared logic lives in
`src/lib/launch-video/*.ts` and is imported with explicit `.ts` specifiers (Node 26 type-stripping).

**Credentials live in the repo `.env` only** (`.env` is never committed; the names are documented in
`.env.example`). A missing credential is a HARD failure with an explicit error — there is no fallback
voice, no default key, no silent truncation.

| # | command | writes into `content/launch_videos/<slug>/` |
|---|---|---|
| 1 | `node scripts/launch-video/detect.mjs` (`--json`, `--probe`) | nothing — prints `PENDING <slug> <launchedAt>` per pending product (monitor mode is byte-stable) |
| 2 | `node scripts/launch-video/voices.mjs --list` | nothing — prints `id<TAB>name<TAB>label` per ElevenLabs voice |
| 3 | `node scripts/launch-video/voiceover.mjs --slug <slug>` (`--dry-run`) | `voiceover.mp3`, `voiceover.json` |
| 4 | `node scripts/launch-video/mux.mjs --slug <slug>` | `launch.mp4` (video stream copied, music ducked under the voice) |
| 5 | `node scripts/launch-video/record.mjs --slug <slug> --status <status> [--bump-attempts] [--error <msg>] [--video-id <id>] [--url <url>] [--words N] [--vo-seconds N] [--video-seconds N]` | nothing on disk — upserts the `launch_videos` row in Supabase |
| 6 | `node scripts/youtube-auth.mjs --url` then `node scripts/youtube-auth.mjs --code <code>` | nothing — prints the one-time consent URL, then the `YOUTUBE_REFRESH_TOKEN=` line to paste into `.env` |
| 7 | `node scripts/launch-video/youtube-upload.mjs --slug <slug>` (`--dry-run`, `--check-auth`) | `youtube.json` |

Artifacts in `content/launch_videos/<slug>/`:

- `narration.txt` — input, written by the agent (the narration the voice reads)
- `brag.mp4` — input, rendered by the `brag` skill
- `brag.jpg` — input, thumbnail/first frame from the `brag` skill
- `share-copy.txt` — input, title + description written by the downstream brag subagent
- `voiceover.mp3` — ElevenLabs narration for the slug
- `voiceover.json` — measured durations, word count, voice/model/output format, byte size
- `launch.mp4` — the file that goes to YouTube (voice over ducked music, `-c:v copy`)
- `youtube.json` — `videoId`, URL, privacy status, title, upload time, thumbnail result

Env vars read by these scripts (repo `.env`):

- required for the voice step: `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` (optional: `ELEVENLABS_MODEL`, `ELEVENLABS_OUTPUT_FORMAT`)
- required for the upload step: `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN` (optional: `YOUTUBE_PRIVACY_STATUS` — shipped default `private`, `YOUTUBE_TAGS`)
- required by the ledger scripts (`detect.mjs`, `record.mjs`): `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- optional: `NEXT_PUBLIC_APP_URL` (product link in the video description)

`content/launch_videos/` is runtime output and is gitignored.
