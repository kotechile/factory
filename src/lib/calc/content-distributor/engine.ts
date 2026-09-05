/**
 * Deterministic Content Distribution & LinkedIn Post Formatting Engine
 *
 * Transforms raw articles and notes into optimized, multi-variant LinkedIn posts
 * with exact character boundary validation, hook extraction, and hashtag normalization.
 */

export type PostFormatVariant = "hook_and_punchline" | "bullet_takeaways" | "story_lesson";

export interface FormatArticleInput {
  title: string;
  content: string;
  sourceUrl?: string;
  tags?: string[];
  authorName?: string;
}

export interface FormattedPostOutput {
  variant: PostFormatVariant;
  title: string;
  postText: string;
  characterCount: number;
  wordCount: number;
  isWithinLimit: boolean; // LinkedIn max 3,000 characters
  previewHook: string; // First 140 chars before LinkedIn "see more" cutoff
  hashtags: string[];
}

export interface DistributionAnalysis {
  title: string;
  summary: string;
  keyPoints: string[];
  extractedHashtags: string[];
  variants: Record<PostFormatVariant, FormattedPostOutput>;
}

const LINKEDIN_MAX_CHARS = 3000;
const SEE_MORE_CUTOFF = 140;

/**
 * Normalizes and cleans raw text from copy-pasting (strips markdown headers, cleans whitespace).
 */
export function cleanRawContent(text: string): string {
  if (!text) return "";
  return text
    .replace(/\r\n/g, "\n")
    .replace(/^#+\s+/gm, "") // remove markdown headers #
    .replace(/[*_~`]/g, "") // remove basic markdown formatting
    .replace(/\n{3,}/g, "\n\n") // collapse multiple blank lines
    .trim();
}

/**
 * Extracts distinct key sentences/points deterministically from an article body.
 */
export function extractKeySentences(content: string, maxPoints = 3): string[] {
  const cleaned = cleanRawContent(content);
  if (!cleaned) return [];

  // Split into paragraphs or bullet lines
  const paragraphs = cleaned
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 25);

  if (paragraphs.length === 0) {
    return [cleaned.slice(0, 150)];
  }

  // Take top sentences from distinct paragraphs
  const results: string[] = [];
  for (const para of paragraphs) {
    const sentences = para
      .split(/(?<=[.?!])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 20);

    for (const sentence of sentences) {
      if (!results.includes(sentence)) {
        results.push(sentence);
        break;
      }
    }
    if (results.length >= maxPoints) break;
  }

  // Fallback if not enough sentences found
  if (results.length === 0 && paragraphs[0]) {
    results.push(paragraphs[0]);
  }

  return results;
}

/**
 * Generates normalized LinkedIn hashtags from tags and content keywords.
 */
export function extractHashtags(tags?: string[], content?: string): string[] {
  const set = new Set<string>();

  // Process explicit tags
  if (tags && Array.isArray(tags)) {
    for (const tag of tags) {
      const clean = tag
        .replace(/[^a-zA-Z0-9]/g, "")
        .trim();
      if (clean) {
        set.add(`#${clean.charAt(0).toUpperCase() + clean.slice(1)}`);
      }
    }
  }

  // Common keywords scanner
  if (content && set.size < 4) {
    const lower = content.toLowerCase();
    const commonTopics: Record<string, string> = {
      tax: "#TaxStrategy",
      saas: "#SaaS",
      ai: "#ArtificialIntelligence",
      engineering: "#SoftwareEngineering",
      startup: "#Startups",
      finance: "#PersonalFinance",
      b2b: "#B2B",
      growth: "#GrowthStrategy",
      marketing: "#Marketing",
      product: "#ProductManagement",
      freelance: "#Freelancing",
      supabase: "#Supabase",
      nextjs: "#NextJS",
    };

    for (const [key, hashtag] of Object.entries(commonTopics)) {
      if (lower.includes(key) && !set.has(hashtag)) {
        set.add(hashtag);
        if (set.size >= 4) break;
      }
    }
  }

  if (set.size === 0) {
    set.add("#Business");
    set.add("#Productivity");
  }

  return Array.from(set).slice(0, 5);
}

/**
 * Generates the "Contrarian / Problem-Agitate" LinkedIn post variant.
 */
function buildHookAndPunchlineVariant(
  title: string,
  keyPoints: string[],
  sourceUrl?: string,
  hashtags: string[] = [],
): string {
  const hook = title.endsWith("?") ? title : `${title}. Here's why most people get this wrong:`;
  const p1 = keyPoints[0] || "Most approaches tackle the symptom instead of the actual root cause.";
  const p2 = keyPoints[1] || "The math and data show a completely different reality when you break it down.";
  const p3 = keyPoints[2] || "Once you adjust the mechanics, the friction vanishes.";

  const lines = [
    hook,
    "",
    `⚠️ The common assumption vs. what actually happens:`,
    "",
    `1. ${p1}`,
    `2. ${p2}`,
    `3. ${p3}`,
    "",
    `💡 Key takeaway: Don't rely on rules of thumb when a deterministic model gives you the exact answer.`,
  ];

  if (sourceUrl) {
    lines.push("", `🔗 Read full details & run calculations: ${sourceUrl}`);
  }

  lines.push("", `What's your experience with this? Drop your thoughts below. 👇`);

  if (hashtags.length > 0) {
    lines.push("", hashtags.join(" "));
  }

  return lines.join("\n");
}

/**
 * Generates the "3-Bullet Actionable Framework" LinkedIn post variant.
 */
function buildBulletTakeawaysVariant(
  title: string,
  keyPoints: string[],
  sourceUrl?: string,
  hashtags: string[] = [],
): string {
  const p1 = keyPoints[0] || "Audit your current baseline with hard numbers.";
  const p2 = keyPoints[1] || "Eliminate hidden assumptions and verify the statutory rules.";
  const p3 = keyPoints[2] || "Automate the calculation to prevent recurring errors.";

  const lines = [
    `📌 ${title}`,
    "",
    `3 actionable takeaways to apply right now:`,
    "",
    `🔹 Insight 1: ${p1}`,
    `🔹 Insight 2: ${p2}`,
    `🔹 Insight 3: ${p3}`,
    "",
    `🎯 Bottom line: Structure and clarity beat guesswork every time.`,
  ];

  if (sourceUrl) {
    lines.push("", `👉 Full breakdown: ${sourceUrl}`);
  }

  lines.push("", `♻️ Repost if you found this useful to your network.`);

  if (hashtags.length > 0) {
    lines.push("", hashtags.join(" "));
  }

  return lines.join("\n");
}

/**
 * Generates the "Story / Lesson Learned" LinkedIn post variant.
 */
function buildStoryLessonVariant(
  title: string,
  keyPoints: string[],
  sourceUrl?: string,
  hashtags: string[] = [],
): string {
  const p1 = keyPoints[0] || "We encountered a persistent bottleneck that took days to resolve.";
  const p2 = keyPoints[1] || "The breakthrough came from revisiting the original core specification.";
  const p3 = keyPoints[2] || "Shipping the solution changed how we approach our whole workflow.";

  const lines = [
    `A quick breakdown on: ${title}`,
    "",
    `Here is what happens behind the scenes:`,
    "",
    p1,
    "",
    p2,
    "",
    p3,
    "",
    `The big lesson? When in doubt, simplify to first principles and automate the verification.`,
  ];

  if (sourceUrl) {
    lines.push("", `Link to full article & tools: ${sourceUrl}`);
  }

  lines.push("", `Agree or disagree?`);

  if (hashtags.length > 0) {
    lines.push("", hashtags.join(" "));
  }

  return lines.join("\n");
}

/**
 * Main deterministic engine function.
 * Given an article input, generates comprehensive distribution analysis and post variants.
 */
export function formatArticleForDistribution(input: FormatArticleInput): DistributionAnalysis {
  const cleanTitle = cleanRawContent(input.title) || "Key Insights & Analysis";
  const keyPoints = extractKeySentences(input.content, 3);
  const hashtags = extractHashtags(input.tags, `${input.title} ${input.content}`);

  const postBuilders: Record<PostFormatVariant, { title: string; build: () => string }> = {
    hook_and_punchline: {
      title: "Contrarian Hook & Breakdown",
      build: () => buildHookAndPunchlineVariant(cleanTitle, keyPoints, input.sourceUrl, hashtags),
    },
    bullet_takeaways: {
      title: "3-Bullet Actionable Framework",
      build: () => buildBulletTakeawaysVariant(cleanTitle, keyPoints, input.sourceUrl, hashtags),
    },
    story_lesson: {
      title: "Executive Story & Lessons",
      build: () => buildStoryLessonVariant(cleanTitle, keyPoints, input.sourceUrl, hashtags),
    },
  };

  const variants = {} as Record<PostFormatVariant, FormattedPostOutput>;

  for (const [key, { title: variantTitle, build }] of Object.entries(postBuilders) as [
    PostFormatVariant,
    { title: string; build: () => string },
  ][]) {
    const text = build();
    const charCount = text.length;
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const previewHook = text.slice(0, SEE_MORE_CUTOFF).trim();

    variants[key] = {
      variant: key,
      title: variantTitle,
      postText: text,
      characterCount: charCount,
      wordCount,
      isWithinLimit: charCount <= LINKEDIN_MAX_CHARS,
      previewHook,
      hashtags,
    };
  }

  const summary = keyPoints.join(" ");

  return {
    title: cleanTitle,
    summary,
    keyPoints,
    extractedHashtags: hashtags,
    variants,
  };
}
