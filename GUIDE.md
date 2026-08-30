# Autonomous Product & Software Factory — Operations Guide

Two parts:
- **Part 1 — How to use the system** (day-to-day operation of the live fleet)
- **Part 2 — Step-by-step: implement what's missing** (Slack, model tiers, Next.js, Coolify, etc.)

Everything below uses real, verified Hermes commands (no `hermes run --agent` / `hermes dispatch` —
those don't exist; the equivalents are noted inline).

---

# Part 1 — How to Use the System

## 1.1 The flywheel at a glance

```
[Signal Recon] ──► [Simon/Phoebe PRD] ──► [Antigravity Build]
      ▲                                        │
      │                                        ▼
[SOP Self-Healing] ◄── [Toby Audit] ◄── [Coolify Deploy & Distribution]
```

You are the human in the loop at exactly one point: **sign-off on a PRD** (and occasional escalations).
Everything else is meant to run unattended.

## 1.2 Your bots

Each bot is a Hermes profile with its own `SOUL.md` (persona) and canonical chat. They appear in the
desktop app's **Bots** tab. Talk to any of them from a shell, or by clicking them in the Bots tab.

| Bot | Role | Talk to it |
|---|---|---|
| `simon` | Chief of Staff — runs recon, drafts PRDs, orchestrates handoffs, escalates to you | `hermes -p simon chat` (or the `simon` wrapper) |
| `scout` | Market Scout — 30-day signal sweeps | `hermes -p scout chat` / `scout` |
| `phoebe` | 10x Challenger — stress-tests PRDs, adds viral loops + WebMCP hooks | `hermes -p phoebe chat` / `phoebe` |
| `toby` | Meta-Auditor — verifies builds, patches SOPs | `hermes -p toby chat` / `toby` |
| `product-director` | Product Director — decomposes PRDs into architecture, leads the build fleet | `hermes -p product-director chat` / `product-director` |
| `echo` | Growth Engine — launch copy, social assets, agent-discovery listing | `hermes -p echo chat` / **`echo-bot`** (the `echo` name is reserved by the shell) |

One-shot (non-interactive) form: `hermes -p simon chat -q "Run the weekly recon now"`.

The **Execution Fleet** (Coder / QA / Copywriter) is *not* persistent bots — they are transient
`delegate_task` subagents that Simon or the Product Director spawn per build (see §2.8).

## 1.3 The routines (cron)

Three jobs run on the Hermes cron scheduler. The gateway (launchd service) was installed during
setup, so they fire automatically. Check status anytime:

```bash
hermes cron status      # scheduler heartbeat + next run
hermes cron list        # the three jobs
```

| Routine | Schedule | What it does |
|---|---|---|
| `[bot:simon] Weekly Market Recon` | Mon 06:00 local | 30-day discovery sweep → 4-filter funnel → PRD to `context/recon_proposals/` |
| `[bot:simon] Daily Proactive Sweep` | daily 08:00 | reviews `context/daily_voice_journal/`, flags action items |
| `[bot:toby] Build Watchdog` | daily 10:00 | checks for new commits, runs `verify-build.sh`, patches SOPs on failure |

**Trigger manually** (don't wait for the schedule):

```bash
hermes cron run "Weekly Market Recon"     # queues on the next scheduler tick
hermes cron run "Daily Proactive Sweep"
hermes cron run "Build Watchdog"
```

**Where output goes:** currently `--deliver local`, so each run's final message is saved to
`~/.hermes/cron/output/<job_id>/<timestamp>.md`. The PRD itself is written by Simon into
`context/recon_proposals/YYYY-MM-DD_<product>.md` (the durable deliverable). See §2.2 to switch
delivery into the bot's chat.

**Inspect run history / failures:**

```bash
hermes cron runs          # execution attempts
hermes cron incidents     # durable failure incidents (ack them here)
```

## 1.4 Running a full cycle manually (end-to-end)

Slack is live, but you can also drive the cycle by talking to Simon directly (either path works):

```bash
# 1. Recon (Simon runs the sweep; Scout is his search engine)
hermes -p simon chat -q "Run the weekly market recon and write the PRD."

# 2. Challenge (Phoebe intercepts the top candidate)
hermes -p phoebe chat -q "Challenge and 10x this PRD: <paste PRD>"

# 3. Sign-off — read the PRD at context/recon_proposals/, then tell Simon to proceed
hermes -p simon chat -q "PRD <name> is approved. Hand it to the Product Director for the build."

# 4. Build (Product Director decomposes + spawns the fleet)
hermes -p product-director chat -q "Decompose this PRD and build the scaffold. See .agents/director_product.md"

# 5. Audit (Toby verifies + patches SOPs)
hermes -p toby chat -q "Audit the latest build and run scripts/verify-build.sh."

# 6. Distribute (Echo generates launch assets)
hermes -p echo-bot chat -q "Generate launch assets for <product>."
```

## 1.5 Where everything lives

```
~/Documents/software-factory-core/      ← the factory repo (source of truth)
├── AGENTS.md            auto-injected rules for any agent working here
├── .agents/             6 persona contracts (= each bot's SOUL.md)
├── skills/              6 SOPs (Toby patches these)
├── context/             company_goals.md · audience_pain_points.md · recon_proposals/ · daily_voice_journal/
└── scripts/             verify-build.sh · cron-market-recon.sh · cron-proactive-sweep.sh

~/.hermes/profiles/<bot>/   each bot's config, SOUL.md, skills, memory
~/.hermes/skills/factory/   6 SOPs installed as first-class skills
~/.hermes/cron/output/      routine run output (deliver=local)
```

## 1.6 Reading results & logs

```bash
hermes cron list                        # jobs + next-run times
hermes cron runs                        # what actually ran and its status
ls ~/.hermes/cron/output/               # saved run messages
tail -f ~/.hermes/logs/gateway.log      # gateway + cron logs
hermes logs errors                      # error log
```

## 1.7 Troubleshooting quickref

| Symptom | Fix |
|---|---|
| Jobs "won't fire" | `hermes cron status` — if gateway stopped: `hermes gateway start` (or reinstall) |
| Job `blocked_config` | `hermes cron list` shows it; usually a missing API key or broken `--deliver` target |
| `echo` not found | use the `echo-bot` alias (or `hermes -p echo`) |
| No Anthropic models available | only DeepSeek is configured — see §2.1 |
| PRD not showing up | check `context/recon_proposals/`; Simon writes there, delivery is `local` |

---

# Part 2 — Step-by-Step: Implement What's Missing

## 2.0 Status checklist

| # | Item | Status |
|---|---|---|
| ✅ | 6 bot profiles + SOULs | done |
| ✅ | 6 SOP skills | done |
| ✅ | 3 cron routines | done, firing |
| ✅ | Gateway (launchd) | done, running |
| ✅ | Repo skeleton + `AGENTS.md` | done |
| ⬜ 2.1 | Claude/OpenRouter model tiers | **needs API keys** |
| ⬜ 2.2 | Routine delivery → bot-chat / Slack | optional, 1 command each |
| ⬜ 2.3 | Slack `#loop-ai` + `@Simon approve` | **needs Slack app** |
| ⬜ 2.4 | Deliberation group chat | desktop UI, 2 min |
| ⬜ 2.5 | Next.js scaffold + Supabase/Stripe/Resend | Phase 1 build |
| ⬜ 2.6 | WebMCP `registerTool` in the app | during Phase 1/4 |
| ⬜ 2.7 | Coolify deploy + Toby build webhook | **needs VPS** |
| ⬜ 2.8 | Execution fleet (delegate_task) | already wired, document only |

---

## 2.1 Add model providers (Claude tiers) and pin per-bot

Only **DeepSeek** is configured today, so every bot runs `deepseek-v4-pro`. To realize the
blueprint's tiering (Simon/Phoebe on Claude 3.7/Opus, Scout/Toby/Echo on Sonnet/Flash):

```bash
# 1. Add a key (or OAuth) for each provider you'll use
hermes auth add anthropic          # interactive; stores in ~/.hermes/.env
hermes auth add openrouter         # if you prefer OpenRouter for multiple Claude tiers

# 2. Pin a model per-bot (desktop: Bots tab → right-click bot → Edit Profile → Model & provider)
#    or CLI one-shot override:
hermes -p simon -m anthropic/claude-sonnet-4.6 chat -q "hi"

# 3. Pin the *routine's* model (cron jobs run on the default model unless pinned):
hermes cron edit "Weekly Market Recon" --provider anthropic --model claude-sonnet-4.6
hermes cron edit "Weekly Market Recon" --reasoning-effort high   # optional
```

> Note: cron jobs are subject to a **model-drift guard** — an unpinned job snapshots its
> provider/model at creation and *fails closed* if the global default later changes. Pinning
> per-job (step 3) is the deliberate way to route spend. Set a fleet-wide default with
> `hermes config set cron.model <name>` if you'd rather not pin each job.

## 2.2 Switch routine delivery into the bot's chat

Currently `--deliver local` (output → files). To have results land in each bot's canonical chat
(so they show up in the Bots tab):

```bash
hermes cron edit "Weekly Market Recon"  --deliver bot-chat:simon
hermes cron edit "Daily Proactive Sweep" --deliver bot-chat:simon
hermes cron edit "Build Watchdog"       --deliver bot-chat:toby
```

Once Slack is connected (§2.3), replace with `--deliver slack` (or `slack:#loop-ai`) to post to
the channel instead.

## 2.3 Connect Slack `#loop-ai` + the `@Simon approve` trigger

Hermes has a **native** Slack adapter — you do *not* need the blueprint's custom
`/src/app/api/slack/events/route.ts`. The gateway *is* a Slack bot.

```bash
# 1. Generate a Slack app manifest (tells you what scopes/events to enable)
hermes slack            # or: hermes slack --help  for subcommands

# 2. Create the app at api.slack.com/apps, install to your workspace,
#    invite it to #loop-ai, and put the bot token + signing secret in ~/.hermes/.env
#    (SLACK_BOT_TOKEN=... , SLACK_SIGNING_SECRET=...)

# 3. Enable + configure the Slack platform in the gateway
hermes gateway setup     # follow the Slack prompts

# 4. Restart the gateway so the adapter loads
hermes gateway restart
```

After that, `@Simon approve` in `#loop-ai` lands in Simon's Slack chat as a normal message. Simon's
SOUL already says: on approval, hand the PRD to the Product Director. (If you want a *strict*
event hook instead of relying on Simon's judgment, use a webhook — see §2.7's pattern — filtered
on `text contains "approve"`.)

## 2.4 Stand up the deliberation group chat

In the **desktop app → Bots tab**: right-click a bot → **Manage groups** → add Simon, Scout,
Phoebe, Toby to one group (2–6 members). Open the group row to let them coordinate: your message
triggers up to three serial rounds of member turns; members `@name` each other and escalate to you
with `@user`. This is the "inter-agent deliberation" layer from the blueprint.

## 2.5 Scaffold the Next.js app (Phase 1) + Supabase/Stripe/Resend

The repo currently has no `src/`. Scaffold it (Antigravity does the heavy lifting; this is the
local fallback):

```bash
cd ~/Documents/software-factory-core
npx create-next-app@latest . --ts --app --tailwind --eslint --src-dir --import-alias "@/*"
npm i lucide-react @supabase/supabase-js @supabase/ssr stripe resend
```

Then create the primitive files the SOPs reference:
- `src/lib/calc/[engine].ts` — the pure-TS calculation engine
- `src/components/ui/` — reusable primitives (per `skills/ui_component_standards.md`)
- `src/app/api/webhooks/stripe/route.ts` — per `skills/stripe_gating_workflow.md`
- `src/lib/` Supabase + Stripe + Resend client helpers

**Secrets are env-only** (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`) in a gitignored `.env.local` —
never hardcoded (this repo's GitHub remote has push protection that rejects committed secrets).

Verify the build gate works:
```bash
chmod +x scripts/verify-build.sh && ./scripts/verify-build.sh
```

## 2.6 Register WebMCP in the app

Per `skills/webmcp-integration.md`: on page load (and route change), register the tool with
`navigator.modelContext.registerTool` using the schema in the skill. The handler calls the pure
`src/lib/calc/[engine].ts` engine (never duplicate logic), free-tier agents get a preview, metered
calls hit the Stripe agent tier.

## 2.7 Deploy to Coolify (Phase 5/6) + Toby build webhook

1. Push the repo to GitHub, then in Coolify: **New Resource → app from git** → point at the repo
   → enable **auto-deploy on main push**. The `Dockerfile`/`docker-compose.yml` go in when you
   scaffold the app (§2.5) or when Antigravity generates them.
2. Set the same env secrets in Coolify (Supabase/Stripe/Resend).
3. **Toby audit on build completion** — enable the webhook platform, then subscribe:

```bash
hermes gateway setup                # enable the webhook platform (port + HMAC secret)

hermes webhook subscribe coolify-build \
  --prompt "You are Toby (see .agents/meta_auditor.md). Build {status} on branch {branch}. Run scripts/verify-build.sh, and on failure patch the matching skills/*.md + append to skills/self_improvement_eval.md." \
  --events "build.finished" \
  --deliver bot-chat:toby
```

Then point Coolify's **webhook/notifications** at the returned URL with the returned secret. This
replaces the blueprint's "Toby verifies build logs" polling with a real push trigger.

## 2.8 Execution fleet (delegate_task)

The Coder/QA/Copywriter workers are `delegate_task` subagents, not persistent bots. When Simon or
the Product Director approves a build, they spawn workers in parallel:

```bash
# Example: Product Director decomposes, then spawns workers
hermes -p product-director chat -q "Decompose this PRD into tasks and delegate: \
  (1) Coder builds src/lib/calc/[engine].ts + UI, (2) QA writes Jest test vectors, \
  (3) Copywriter drafts the WebMCP schema description. Integrate their output."
```

Inside a session, this is the `delegate_task` tool (bounded, parallel, isolated-context). The
persona contract for each worker lives in the Product Director's instructions rather than a profile.

---

## Part 3 — Deploying & Publishing (Coolify)

Self-hosted PaaS on a VPS, git-push-to-deploy. One-time setup; after that **push to `main` = publish**.

### One-time setup
1. **VPS** — any provider, Ubuntu 22.04+, ≥2 GB RAM. Open ports 80/443 (8000 for the Coolify UI during install).
2. **Install Coolify** — `curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash`, then open the dashboard URL it prints.
3. **Add application** — Projects → Add → **Application** → Source = **GitHub** → connect your account → repo `kotechile/factory`, branch `main`, build pack = **Dockerfile**.
4. **Dockerfile** — Antigravity's baseline prompt generates it (needs `output: 'standalone'` in `next.config.mjs`). Reference below.
5. **Environment variables** — app → Environment Variables: add the names from `.env.example` (Supabase URL + service_role, Stripe secret + webhook secret, Resend key). Values live ONLY here, injected at runtime — never in the repo.
6. **Domain + SSL** — app → Domains → add your domain; Coolify auto-issues Let's Encrypt. (Or use the generated `*.coolify.io` URL for testing.)

### Ongoing — publishing a product
- **Publish** = `git push origin main`. Coolify detects the push and deploys. Nothing else to click.
- **Rollback** = app → Deployments → pick an earlier build → **Rollback** (instant).
- **Watch** = Coolify → Notifications → add **Slack** → `#loop-ai`; deploy success/failure posts there natively.
- **Rotate secrets** = edit in Coolify → **Restart** to apply.

### Feedback loop (Toby)
- **Code audit (always on):** Toby's daily 10:00 watchdog runs `scripts/verify-build.sh` on any new commit locally, patches SOPs on failure — independent of Coolify.
- **Deploy audit (optional):** Coolify → Webhooks → POST to a Hermes webhook so Toby inspects real build logs:
  `hermes webhook subscribe coolify-build --prompt "You are Toby, audit this deploy {payload}" --deliver bot-chat:toby`
  Needs your Mac reachable from the VPS (Tailscale is easiest). Otherwise Slack notifications + Toby's cron already give visibility + self-healing.

### Reference Dockerfile (Next.js standalone)
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## Quick reference — the commands that matter

```bash
hermes cron status / list / run "<name>" / edit "<name>" / runs / incidents
hermes -p <bot> chat -q "..."          # one-shot bot turn
hermes gateway status / restart         # the daemon that fires cron
hermes webhook subscribe <name> ...     # push triggers (Slack/Coolify/GitHub)
hermes auth add <provider>              # add Claude/OpenRouter keys
hermes skills list                      # confirm the 6 'factory' SOPs
```
