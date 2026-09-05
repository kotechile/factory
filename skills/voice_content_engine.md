---
name: voice-content-engine
description: "Use when generating launch copy and social assets."
version: 1.0.0
license: MIT
platforms: [linux, macos, windows]
---

# SKILL: Voice Content Engine

## 1. Objective
Transform product metadata + recordings into platform-specific distribution scripts and social assets.

## 2. Inputs
- Product PRD + name + target persona.
- Screen recording / screenshots.
- Deterministic outputs (sample result, PDF export).

## 3. Outputs
- Comprehensive long-form technical pillar article (1,000+ words, statutory citations, markdown).
- One-liner + 3-bullet launch post per platform (LinkedIn, X, Reddit-friendly, Product Hunt).
- 30/60/90s voice-script for short-form video.
- Embeddable widget snippet (if the product has one).
- Direct synchronization with Supabase `articles` and `linkedin_posts` tables via `node scripts/generate-content-suite.mjs`.

## 4. Automated Execution Pipeline
Hermes (`echo` / `seeder`) automatically executes the content suite generation:
```bash
node scripts/generate-content-suite.mjs --product <slug>
```
This inserts the long-form pillar article into Supabase and queues the formatted companion LinkedIn posts for 1-click review and distribution in PressFlow (`/pressflow`).

## 5. Voice rules
- No fabricated metrics or testimonials. Every claim traces to a real output or statutory citation.
- Lead with the acute pain point, then the deterministic answer, then the agent hook.

## 6. Failure handling
- Underperforming assets → Echo logs the channel-specific feedback to this skill.

