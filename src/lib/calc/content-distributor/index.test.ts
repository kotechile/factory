import { describe, it, expect } from "vitest";
import {
  cleanRawContent,
  extractKeySentences,
  extractHashtags,
  getRecommendedSubreddits,
  buildRedditSubmitUrl,
  formatArticleForDistribution,
  SOFTWARE_BLUEPRINTS,
  generateDistributionTasksForSoftware,
  generateDistributionTasksForArticle,
  generateWeeklyBatch,
} from "./engine";

describe("Content Distributor & Multi-Platform Engine", () => {
  it("cleans raw markdown headers and excess whitespace", () => {
    const raw = "### Article Title\n\n\nSome body text with **bold**.\n\n\nEnd note.";
    const cleaned = cleanRawContent(raw);
    expect(cleaned).toBe("Article Title\n\nSome body text with bold.\n\nEnd note.");
  });

  it("extracts key sentences deterministically from paragraphs", () => {
    const content = `The quick brown fox jumps over the lazy dog repeatedly in the forest. This is the second sentence of paragraph one.
    
Understanding self-employment tax calculations requires checking statutory brackets. Many guides mistakenly cite draft bills.
    
Always automate the testing pipeline before deploying to production. Verification ensures high reliability.`;

    const sentences = extractKeySentences(content, 3);
    expect(sentences.length).toBe(3);
    expect(sentences[0]).toContain("The quick brown fox");
    expect(sentences[1]).toContain("Understanding self-employment tax");
    expect(sentences[2]).toContain("Always automate the testing pipeline");
  });

  it("extracts and normalizes hashtags from tags and content", () => {
    const tags = ["Tax Planning", "Next.js", "AI-Tools"];
    const content = "Building an engineering startup for b2b finance.";
    const hashtags = extractHashtags(tags, content);

    expect(hashtags).toContain("#TaxPlanning");
    expect(hashtags).toContain("#Nextjs");
    expect(hashtags).toContain("#AITools");
    expect(hashtags.length).toBeLessThanOrEqual(5);
  });

  it("recommends appropriate subreddits based on keywords", () => {
    const taxSubs = getRecommendedSubreddits(["Tax", "Schedule C"], "IRS QBI calculations");
    expect(taxSubs).toContain("tax");
    expect(taxSubs).toContain("freelance");

    const stripeSubs = getRecommendedSubreddits(["Stripe"], "Payout reconciliation to general ledger");
    expect(stripeSubs).toContain("SaaS");
    expect(stripeSubs).toContain("accounting");

    const nextjsSubs = getRecommendedSubreddits(["Next.js", "Supabase"], "Fullstack web application");
    expect(nextjsSubs).toContain("webdev");
    expect(nextjsSubs).toContain("nextjs");
  });

  it("builds valid zero-API Reddit Web Intent submission URLs", () => {
    const url = buildRedditSubmitUrl("r/tax", "QBI 20% Rule", "Here is the statutory breakdown.");
    expect(url).toContain("https://www.reddit.com/r/tax/submit?");
    expect(url).toContain("title=QBI+20%25+Rule");
    expect(url).toContain("text=Here+is+the+statutory+breakdown.");
  });

  it("formats article into 3 valid LinkedIn and 3 Reddit variants", () => {
    const input = {
      title: "The 2026 QBI Tax Misconception",
      content:
        "Several high-ranking guides tell Schedule C filers to use 23% for QBI under OBBBA. In reality, Pub. L. 119-21 kept the statutory deduction strictly at 20%. Using 23% underfunds your estimated tax liability. Deterministic calculators eliminate this risk completely.",
      sourceUrl: "https://factory.aichieve.net/quarterline",
      tags: ["Tax", "Freelance"],
    };

    const result = formatArticleForDistribution(input);

    expect(result.title).toBe("The 2026 QBI Tax Misconception");
    expect(result.keyPoints.length).toBeGreaterThan(0);

    // LinkedIn checks
    expect(result.variants.hook_and_punchline).toBeDefined();
    expect(result.variants.bullet_takeaways).toBeDefined();
    expect(result.variants.story_lesson).toBeDefined();

    for (const variantKey of ["hook_and_punchline", "bullet_takeaways", "story_lesson"] as const) {
      const variant = result.variants[variantKey];
      expect(variant.characterCount).toBeGreaterThan(50);
      expect(variant.characterCount).toBeLessThanOrEqual(3000);
      expect(variant.isWithinLimit).toBe(true);
      expect(variant.postText).toContain("https://factory.aichieve.net/quarterline");
    }

    // Reddit checks
    expect(result.redditVariants.math_breakdown).toBeDefined();
    expect(result.redditVariants.discussion_question).toBeDefined();
    expect(result.redditVariants.show_and_tell).toBeDefined();

    for (const rKey of ["math_breakdown", "discussion_question", "show_and_tell"] as const) {
      const rVariant = result.redditVariants[rKey];
      expect(rVariant.title.length).toBeGreaterThan(10);
      expect(rVariant.postText.length).toBeGreaterThan(50);
      expect(rVariant.submitUrl).toContain("https://www.reddit.com/r/");
      expect(rVariant.submitUrl).toContain("submit?");
    }
  });

  it("generates software distribution tasks from blueprints", () => {
    const blueprint = SOFTWARE_BLUEPRINTS.quarterline;
    expect(blueprint).toBeDefined();

    const tasks = generateDistributionTasksForSoftware(blueprint);
    expect(tasks.length).toBeGreaterThan(1);

    const redditTask = tasks.find((t) => t.platform === "reddit");
    expect(redditTask).toBeDefined();
    expect(redditTask?.channel).toContain("r/");
    expect(redditTask?.submit_url).toContain("reddit.com");
    expect(redditTask?.status).toBe("ready_to_publish");

    const linkedinTask = tasks.find((t) => t.platform === "linkedin");
    expect(linkedinTask).toBeDefined();
    expect(linkedinTask?.submit_url).toContain("linkedin.com");
  });

  it("generates weekly batch containing both software and article tasks", () => {
    const sampleArticles = [
      {
        id: "art-1",
        title: "2026 Self Employment Brackets",
        content: "Detailed breakdown of the 2026 inflation adjustments and safe harbor limits.",
        tags: ["Tax"],
        sourceUrl: "https://factory.aichieve.net/quarterline",
      },
    ];

    const weeklyBatch = generateWeeklyBatch(sampleArticles);
    expect(weeklyBatch.length).toBeGreaterThan(5);

    const softwareTasks = weeklyBatch.filter((t) => t.source_type === "software");
    const articleTasks = weeklyBatch.filter((t) => t.source_type === "article");

    expect(softwareTasks.length).toBeGreaterThan(0);
    expect(articleTasks.length).toBeGreaterThan(0);

    // Verify all tasks have default status 'ready_to_publish'
    for (const task of weeklyBatch) {
      expect(task.status).toBe("ready_to_publish");
      expect(task.channel.length).toBeGreaterThan(0);
      expect(task.post_title.length).toBeGreaterThan(0);
      expect(task.post_content.length).toBeGreaterThan(0);
    }
  });
});
