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
- One-liner + 3-bullet launch post per platform (X, LinkedIn, Reddit-friendly, Product Hunt).
- 30/60/90s voice-script for short-form video.
- Embeddable widget snippet (if the product has one).

## 4. Voice rules
- No fabricated metrics or testimonials. Every claim traces to a real output.
- Lead with the pain point, then the deterministic answer, then the agent hook.

## 5. Failure handling
- Underperforming assets → Echo logs the channel-specific feedback to this skill.
