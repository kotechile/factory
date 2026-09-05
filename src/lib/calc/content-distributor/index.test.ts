import { describe, it, expect } from "vitest";
import {
  cleanRawContent,
  extractKeySentences,
  extractHashtags,
  formatArticleForDistribution,
} from "./engine";

describe("Content Distributor & LinkedIn Formatter Engine", () => {
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

  it("formats article into 3 valid LinkedIn variants within character limits", () => {
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
    expect(result.variants.hook_and_punchline).toBeDefined();
    expect(result.variants.bullet_takeaways).toBeDefined();
    expect(result.variants.story_lesson).toBeDefined();

    // Verify all 3 variants are within LinkedIn's 3,000 char limit
    for (const variantKey of ["hook_and_punchline", "bullet_takeaways", "story_lesson"] as const) {
      const variant = result.variants[variantKey];
      expect(variant.characterCount).toBeGreaterThan(50);
      expect(variant.characterCount).toBeLessThanOrEqual(3000);
      expect(variant.isWithinLimit).toBe(true);
      expect(variant.postText).toContain("https://factory.aichieve.net/quarterline");
      expect(variant.previewHook.length).toBeLessThanOrEqual(140);
    }
  });

  it("handles empty or sparse inputs gracefully with fallback text", () => {
    const result = formatArticleForDistribution({
      title: "",
      content: "Short note.",
    });

    expect(result.title).toBe("Key Insights & Analysis");
    expect(result.variants.bullet_takeaways.isWithinLimit).toBe(true);
  });
});
