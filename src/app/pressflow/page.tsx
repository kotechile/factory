"use client";

import * as React from "react";
import {
  formatArticleForDistribution,
  type PostFormatVariant,
  type DistributionAnalysis,
} from "@/lib/calc/content-distributor/engine";
import { buildLinkedInShareUrl } from "@/lib/articles/linkedin";
import type { Article, LinkedInPost } from "@/lib/articles/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import {
  Sparkles,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Send,
  Database,
  Settings,
  FileText,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Globe,
  ThumbsUp,
  MessageSquare,
  Repeat,
  ArrowRight,
  BookOpen,
} from "lucide-react";

const SAMPLE_ARTICLE = {
  title: "The 2026 QBI Tax Misconception: Why 23% Underfunds Your Estimated Tax",
  sourceUrl: "https://factory.aichieve.net/quarterline",
  tags: "Tax, SmallBusiness, Freelance, Accounting",
  content: `Several high-ranking tax guides and freelance accounting blogs are currently instructing filers to calculate Section 199A QBI deductions at 23% under OBBBA.

While a 23% statutory rate appeared in an earlier House legislative draft, the final enacted OBBBA legislation (Pub. L. 119-21) kept the rate strictly at 20%.

If you calculate your Q3 estimated tax payment using 23%, your deduction is overstated by 15% and your quarterly installment is underfunded. For single filers near the Rev. Proc. 2025-32 threshold ($201,750), the shortfall can trigger Section 6654 underpayment penalties.

Deterministic tax calculators that reference the statutory text and official revenue procedures eliminate these widespread rule-of-thumb errors completely.`,
};

export default function PressFlowPage() {
  // Article form state
  const [title, setTitle] = React.useState(SAMPLE_ARTICLE.title);
  const [content, setContent] = React.useState(SAMPLE_ARTICLE.content);
  const [sourceUrl, setSourceUrl] = React.useState(SAMPLE_ARTICLE.sourceUrl);
  const [tagsInput, setTagsInput] = React.useState(SAMPLE_ARTICLE.tags);
  const [currentArticleId, setCurrentArticleId] = React.useState<string | null>(null);

  // Formatted post state
  const [selectedVariant, setSelectedVariant] = React.useState<PostFormatVariant>("bullet_takeaways");
  const [customText, setCustomText] = React.useState<string>("");
  const [isCustomEdited, setIsCustomEdited] = React.useState<boolean>(false);

  // Supabase data state
  const [articles, setArticles] = React.useState<Article[]>([]);
  const [posts, setPosts] = React.useState<LinkedInPost[]>([]);
  const [isSupabaseConnected, setIsSupabaseConnected] = React.useState<boolean>(true);
  const [isLoadingArticles, setIsLoadingArticles] = React.useState<boolean>(false);
  const [isSavingArticle, setIsSavingArticle] = React.useState<boolean>(false);
  const [isPublishing, setIsPublishing] = React.useState<boolean>(false);

  // UI state
  const [copied, setCopied] = React.useState<boolean>(false);
  const [notification, setNotification] = React.useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showHistoryModal, setShowHistoryModal] = React.useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = React.useState<boolean>(false);

  // Settings & Credentials state
  const [authorUrn, setAuthorUrn] = React.useState<string>("");
  const [accessToken, setAccessToken] = React.useState<string>("");
  const [hasConfiguredCredentials, setHasConfiguredCredentials] = React.useState<boolean>(false);
  const [isSavingSettings, setIsSavingSettings] = React.useState<boolean>(false);

  // Deterministic analysis derived from inputs
  const analysis: DistributionAnalysis = React.useMemo(() => {
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    return formatArticleForDistribution({
      title: title || "Key Insights & Analysis",
      content: content || "Paste your article or notes here to format.",
      sourceUrl: sourceUrl || undefined,
      tags,
    });
  }, [title, content, sourceUrl, tagsInput]);

  // Synchronize active post text when variant changes (unless manually edited)
  const activePostText = React.useMemo(() => {
    if (isCustomEdited && customText) {
      return customText;
    }
    return analysis.variants[selectedVariant]?.postText || "";
  }, [isCustomEdited, customText, analysis, selectedVariant]);

  // Load articles and settings on mount
  React.useEffect(() => {
    loadArticles();
    loadPosts();
    loadLinkedInConfig();
  }, []);

  // Show notification auto-dismiss
  React.useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  async function loadArticles() {
    setIsLoadingArticles(true);
    try {
      const res = await fetch("/api/articles");
      const data = await res.json();
      if (data.success && Array.isArray(data.articles)) {
        setArticles(data.articles);
        setIsSupabaseConnected(true);
      }
    } catch {
      setIsSupabaseConnected(false);
    } finally {
      setIsLoadingArticles(false);
    }
  }

  async function loadPosts() {
    try {
      const res = await fetch("/api/linkedin/posts");
      const data = await res.json();
      if (data.success && Array.isArray(data.posts)) {
        setPosts(data.posts);
      }
    } catch {
      // Supabase table query fallback
    }
  }

  async function loadLinkedInConfig() {
    try {
      const res = await fetch("/api/linkedin/config");
      const data = await res.json();
      if (data.success) {
        setAuthorUrn(data.author_urn || "");
        setHasConfiguredCredentials(Boolean(data.hasConfig));
      }
    } catch {
      // Ignore
    }
  }

  async function handleSaveArticle() {
    if (!title || !content) {
      setNotification({ type: "error", message: "Please provide a title and content." });
      return;
    }
    setIsSavingArticle(true);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: currentArticleId || undefined,
          title,
          content,
          source_url: sourceUrl,
          tags,
        }),
      });

      const data = await res.json();
      if (data.success && data.article) {
        setCurrentArticleId(data.article.id);
        setNotification({ type: "success", message: "Article saved to Supabase successfully!" });
        loadArticles();
      } else {
        throw new Error(data.error || "Failed to save article");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving to Supabase";
      setNotification({ type: "error", message: msg });
    } finally {
      setIsSavingArticle(false);
    }
  }

  async function handleSaveDraftPost() {
    try {
      const res = await fetch("/api/linkedin/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          article_id: currentArticleId || undefined,
          content: activePostText,
          format_variant: selectedVariant,
          status: "draft",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNotification({ type: "success", message: "Draft post queued in Supabase!" });
        loadPosts();
      }
    } catch {
      setNotification({ type: "error", message: "Failed to queue draft post." });
    }
  }

  async function handlePushToLinkedIn() {
    if (!activePostText) return;
    setIsPublishing(true);
    try {
      const res = await fetch("/api/linkedin/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          article_id: currentArticleId || undefined,
          content: activePostText,
          format_variant: selectedVariant,
          source_url: sourceUrl || undefined,
          link_title: title || undefined,
          author_urn: authorUrn || undefined,
          access_token: accessToken || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setNotification({
          type: "success",
          message: `🚀 Successfully published to LinkedIn! Post URN: ${data.linkedin_post_urn || "Verified"}`,
        });
        loadPosts();
      } else {
        // Offer quick fallback to open in web intent
        setNotification({
          type: "error",
          message: `${data.error || "Publish failed"}. You can use "Open in LinkedIn" as instant fallback.`,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error publishing post";
      setNotification({ type: "error", message: msg });
    } finally {
      setIsPublishing(false);
    }
  }

  function handleCopy() {
    if (!activePostText) return;
    navigator.clipboard.writeText(activePostText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function handleOpenInLinkedIn() {
    const url = buildLinkedInShareUrl(activePostText, sourceUrl || undefined);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleSaveSettings() {
    setIsSavingSettings(true);
    try {
      const res = await fetch("/api/linkedin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author_urn: authorUrn,
          access_token: accessToken,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setHasConfiguredCredentials(Boolean(data.hasToken));
        setNotification({ type: "success", message: "LinkedIn API credentials saved to Supabase!" });
        setShowSettingsModal(false);
      }
    } catch {
      setNotification({ type: "error", message: "Failed to save settings." });
    } finally {
      setIsSavingSettings(false);
    }
  }

  function handleSelectArticle(art: Article) {
    setTitle(art.title);
    setContent(art.content);
    setSourceUrl(art.source_url || "");
    setTagsInput((art.tags || []).join(", "));
    setCurrentArticleId(art.id);
    setIsCustomEdited(false);
    setCustomText("");
    setShowHistoryModal(false);
    setNotification({ type: "success", message: `Loaded: "${art.title}"` });
  }

  async function handleDeleteArticle(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/articles?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setArticles((prev) => prev.filter((a) => a.id !== id));
        if (currentArticleId === id) setCurrentArticleId(null);
        setNotification({ type: "success", message: "Article removed." });
      }
    } catch {
      setNotification({ type: "error", message: "Failed to delete article." });
    }
  }

  function loadSampleData() {
    setTitle(SAMPLE_ARTICLE.title);
    setContent(SAMPLE_ARTICLE.content);
    setSourceUrl(SAMPLE_ARTICLE.sourceUrl);
    setTagsInput(SAMPLE_ARTICLE.tags);
    setCurrentArticleId(null);
    setIsCustomEdited(false);
    setCustomText("");
    setNotification({ type: "success", message: "Loaded 2026 Tax Article sample." });
  }

  const charCount = activePostText.length;
  const isOverLimit = charCount > 3000;
  const charPercent = Math.min(100, Math.round((charCount / 3000) * 100));

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Top Banner / Notification */}
      {notification && (
        <div
          role="status"
          className={`sticky top-0 z-50 flex items-center justify-between px-6 py-3 border-b text-sm font-medium transition-all ${
            notification.type === "success"
              ? "bg-success/10 border-success/30 text-success"
              : "bg-destructive/10 border-destructive/30 text-destructive"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-xs font-semibold underline hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Container */}
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header Bar */}
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
                <Share2 className="h-7 w-7 text-primary" />
                PressFlow
              </h1>
              <Badge variant="accent">Supabase + LinkedIn Engine</Badge>
              <Badge variant={isSupabaseConnected ? "success" : "warning"}>
                <Database className="mr-1 h-3 w-3 inline" />
                {isSupabaseConnected ? "Supabase Connected" : "Supabase Offline"}
              </Badge>
            </div>
            <p className="text-sm text-muted">
              Paste articles, generate high-converting viral LinkedIn variants with deterministic formatting, manage queues in Supabase, and push directly to LinkedIn.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistoryModal(true)}
              className="gap-1.5"
            >
              <BookOpen className="h-4 w-4 text-primary" />
              Library ({articles.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadSampleData}
              className="gap-1.5"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              Load Sample
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettingsModal(true)}
              className="gap-1.5"
            >
              <Settings className="h-4 w-4 text-muted" />
              Settings
            </Button>
          </div>
        </header>

        {/* Workbench Grid */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Column: Article Input & Manager (5 cols) */}
          <section className="lg:col-span-5 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <CardTitle>Article Source</CardTitle>
                  </div>
                  {currentArticleId && (
                    <Badge variant="muted" className="text-[10px]">
                      Saved ID: {currentArticleId.slice(0, 8)}...
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  Copy-paste your article, memo, or raw notes. PressFlow extracts hooks and formats them for LinkedIn distribution.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Article Title / Core Topic"
                  placeholder="e.g. 2026 Self-Employment Tax & QBI Traps"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setIsCustomEdited(false);
                  }}
                />

                <Input
                  label="Source URL / Product Link"
                  placeholder="https://factory.aichieve.net/quarterline"
                  value={sourceUrl}
                  onChange={(e) => {
                    setSourceUrl(e.target.value);
                    setIsCustomEdited(false);
                  }}
                  helperText="Optional link included at the bottom of the LinkedIn post & card."
                />

                <Input
                  label="Topic Tags (comma-separated)"
                  placeholder="Tax, Accounting, SaaS, AI"
                  value={tagsInput}
                  onChange={(e) => {
                    setTagsInput(e.target.value);
                    setIsCustomEdited(false);
                  }}
                  helperText="Automatically converted into normalized LinkedIn hashtags."
                />

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="article-content"
                      className="text-[13px] font-medium leading-none text-muted"
                    >
                      Article Content / Body
                    </label>
                    <span className="text-xs text-subtle">
                      {content.split(/\s+/).filter(Boolean).length} words
                    </span>
                  </div>
                  <textarea
                    id="article-content"
                    rows={12}
                    value={content}
                    onChange={(e) => {
                      setContent(e.target.value);
                      setIsCustomEdited(false);
                    }}
                    placeholder="Paste article body or notes here..."
                    className="w-full rounded border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTitle("");
                      setContent("");
                      setSourceUrl("");
                      setTagsInput("");
                      setCurrentArticleId(null);
                      setIsCustomEdited(false);
                      setCustomText("");
                    }}
                  >
                    Clear
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSaveArticle}
                    disabled={isSavingArticle || !title || !content}
                    className="gap-1.5"
                  >
                    {isSavingArticle ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Database className="h-4 w-4" />
                    )}
                    Save to Supabase
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Extracted Key Insights Box */}
            {analysis.keyPoints.length > 0 && (
              <Card className="bg-card/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Deterministic Extraction Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted">
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">Extracted Key Points:</p>
                    <ul className="list-disc pl-4 space-y-1 text-muted">
                      {analysis.keyPoints.map((point, i) => (
                        <li key={i}>{point}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="pt-2 flex flex-wrap gap-1">
                    {analysis.extractedHashtags.map((ht) => (
                      <span
                        key={ht}
                        className="rounded bg-primary/10 px-2 py-0.5 text-primary text-[11px] font-mono"
                      >
                        {ht}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </section>

          {/* Right Column: LinkedIn Post Engine & Preview (7 cols) */}
          <section className="lg:col-span-7 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      LinkedIn Post Formatter
                    </CardTitle>
                    <CardDescription>
                      Choose a proven viral format variant or customize your post before pushing.
                    </CardDescription>
                  </div>

                  {/* Character Counter Badge */}
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p
                        className={`text-xs font-mono font-medium ${
                          isOverLimit ? "text-destructive" : "text-muted"
                        }`}
                      >
                        {charCount} / 3,000 chars
                      </p>
                      <div className="w-24 h-1.5 bg-border rounded-full overflow-hidden mt-0.5">
                        <div
                          className={`h-full transition-all ${
                            isOverLimit
                              ? "bg-destructive"
                              : charPercent > 85
                              ? "bg-warning"
                              : "bg-primary"
                          }`}
                          style={{ width: `${charPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Format Variant Selector Pills */}
                <div className="flex flex-wrap gap-2 pt-3 border-t border-border mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedVariant("bullet_takeaways");
                      setIsCustomEdited(false);
                    }}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                      selectedVariant === "bullet_takeaways" && !isCustomEdited
                        ? "bg-primary text-card shadow-sm"
                        : "bg-background border border-border text-muted hover:text-foreground"
                    }`}
                  >
                    📌 3-Bullet Framework
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedVariant("hook_and_punchline");
                      setIsCustomEdited(false);
                    }}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                      selectedVariant === "hook_and_punchline" && !isCustomEdited
                        ? "bg-primary text-card shadow-sm"
                        : "bg-background border border-border text-muted hover:text-foreground"
                    }`}
                  >
                    ⚡ Contrarian Hook & Breakdown
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedVariant("story_lesson");
                      setIsCustomEdited(false);
                    }}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                      selectedVariant === "story_lesson" && !isCustomEdited
                        ? "bg-primary text-card shadow-sm"
                        : "bg-background border border-border text-muted hover:text-foreground"
                    }`}
                  >
                    📖 Story & Lessons
                  </button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Editable Post Textarea */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="linkedin-post-content"
                      className="text-xs font-medium text-muted"
                    >
                      Post Draft Content
                    </label>
                    {isCustomEdited && (
                      <span className="text-[11px] text-primary font-medium">
                        (Custom edited)
                      </span>
                    )}
                  </div>
                  <textarea
                    id="linkedin-post-content"
                    rows={8}
                    value={activePostText}
                    onChange={(e) => {
                      setIsCustomEdited(true);
                      setCustomText(e.target.value);
                    }}
                    className="w-full rounded border border-border bg-background p-3 text-sm text-foreground font-sans placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  />
                </div>

                {/* Live LinkedIn Feed Preview Card */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                      LinkedIn Feed Appearance
                    </p>
                    <span className="text-[11px] text-subtle flex items-center gap-1">
                      <Globe className="h-3 w-3" /> Public Member Visibility
                    </span>
                  </div>

                  <div className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-3">
                    {/* Feed Post Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-card font-bold text-sm">
                          SF
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-foreground">
                              Software Factory
                            </span>
                            <span className="text-[10px] text-muted">• 1st</span>
                          </div>
                          <p className="text-[11px] text-muted">
                            Autonomous Product &amp; Engineering Engine
                          </p>
                          <div className="flex items-center gap-1 text-[10px] text-subtle">
                            <span>Just now</span>
                            <span>•</span>
                            <Globe className="h-2.5 w-2.5 inline" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Feed Post Body */}
                    <div className="text-sm text-foreground whitespace-pre-line leading-relaxed font-sans">
                      {activePostText}
                    </div>

                    {/* Optional URL Card Preview */}
                    {sourceUrl && (
                      <div className="rounded border border-border bg-background/50 p-3 space-y-1">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {title || "Verified Calculation Engine"}
                        </p>
                        <p className="text-[11px] text-muted truncate">{sourceUrl}</p>
                      </div>
                    )}

                    {/* LinkedIn Feed Engagement Bar */}
                    <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted">
                      <button
                        type="button"
                        className="flex items-center gap-1.5 hover:text-foreground"
                      >
                        <ThumbsUp className="h-4 w-4" />
                        <span>Like</span>
                      </button>
                      <button
                        type="button"
                        className="flex items-center gap-1.5 hover:text-foreground"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span>Comment</span>
                      </button>
                      <button
                        type="button"
                        className="flex items-center gap-1.5 hover:text-foreground"
                      >
                        <Repeat className="h-4 w-4" />
                        <span>Repost</span>
                      </button>
                      <button
                        type="button"
                        className="flex items-center gap-1.5 hover:text-foreground"
                      >
                        <Send className="h-4 w-4" />
                        <span>Send</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopy}
                      className="gap-1.5 flex-1 sm:flex-initial"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 text-success" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copy Text
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOpenInLinkedIn}
                      className="gap-1.5 flex-1 sm:flex-initial"
                      title="Open LinkedIn Composer in a new tab"
                    >
                      <ExternalLink className="h-4 w-4 text-primary" />
                      Open in LinkedIn
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSaveDraftPost}
                      className="gap-1.5 flex-1 sm:flex-initial"
                    >
                      <Database className="h-4 w-4" />
                      Queue Draft
                    </Button>

                    <Button
                      variant="default"
                      size="sm"
                      onClick={handlePushToLinkedIn}
                      disabled={isPublishing || !activePostText || isOverLimit}
                      className="gap-1.5 flex-1 sm:flex-initial"
                    >
                      {isPublishing ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Pushing...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Push to LinkedIn
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>

        {/* Supabase Post Queue / History Strip */}
        <section className="mt-12 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                Supabase Distribution Queue &amp; History
              </h2>
              <p className="text-xs text-muted">
                Persistent log of posts stored and published in Supabase.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadPosts}
              className="gap-1 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>

          {posts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted text-sm">
              <Database className="h-8 w-8 mx-auto text-muted/50 mb-2" />
              No posts stored in Supabase yet. Click &quot;Queue Draft&quot; or &quot;Push to LinkedIn&quot; to save records.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {posts.map((p) => (
                <div
                  key={p.id}
                  className="rounded-lg border border-border bg-card p-4 space-y-3 shadow-sm flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant={
                          p.status === "published"
                            ? "success"
                            : p.status === "failed"
                            ? "destructive"
                            : p.status === "publishing"
                            ? "accent"
                            : "muted"
                        }
                      >
                        {p.status.toUpperCase()}
                      </Badge>
                      <span className="text-[10px] text-muted flex items-center gap-1 font-mono">
                        <Clock className="h-3 w-3" />
                        {new Date(p.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-foreground line-clamp-4 whitespace-pre-line font-sans">
                      {p.content}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted">
                    <span className="truncate max-w-[150px]">
                      {p.linkedin_post_urn || p.format_variant}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomText(p.content);
                        setIsCustomEdited(true);
                        setNotification({ type: "success", message: "Draft loaded into editor." });
                      }}
                      className="text-primary font-medium hover:underline flex items-center gap-0.5"
                    >
                      Load into Editor <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Library Drawer Modal */}
      <Modal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        title="Saved Article Library (Supabase)"
        description="Articles saved in your factory Supabase database."
        className="max-w-2xl"
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {isLoadingArticles ? (
            <div className="py-8 text-center text-sm text-muted">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
              Loading articles from Supabase...
            </div>
          ) : articles.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted">
              No saved articles found in Supabase yet.
            </div>
          ) : (
            articles.map((art) => (
              <div
                key={art.id}
                onClick={() => handleSelectArticle(art)}
                className="rounded border border-border bg-background p-4 hover:border-primary/50 cursor-pointer transition-colors space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-semibold text-foreground hover:text-primary">
                    {art.title}
                  </h4>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteArticle(art.id, e)}
                    className="text-muted hover:text-destructive p-1 rounded"
                    title="Delete article"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-xs text-muted line-clamp-2">{art.content}</p>
                <div className="flex items-center justify-between text-[11px] text-subtle pt-1">
                  <span>{new Date(art.created_at).toLocaleDateString()}</span>
                  {art.source_url && (
                    <span className="text-primary truncate max-w-[200px]">
                      {art.source_url}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* Settings Modal */}
      <Modal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        title="LinkedIn & Supabase Integration Settings"
        description="Manage API credentials for pushing directly to LinkedIn."
      >
        <div className="space-y-4">
          <div className="rounded border border-border bg-background p-3 text-xs space-y-1 text-muted">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Supabase Status: Active
            </p>
            <p>
              Articles and post queues are stored in the <code className="font-mono text-primary">articles</code> and <code className="font-mono text-primary">linkedin_posts</code> tables.
            </p>
          </div>

          <Input
            label="LinkedIn Author URN"
            placeholder="urn:li:person:XXXX or urn:li:organization:XXXX"
            value={authorUrn}
            onChange={(e) => setAuthorUrn(e.target.value)}
            helperText="Your LinkedIn Person URN or Organization URN."
          />

          <Input
            label="LinkedIn Access Token"
            type="password"
            placeholder="Enter LinkedIn Bearer Access Token"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            helperText={
              hasConfiguredCredentials
                ? "Access token is saved in Supabase. Enter a new token to update."
                : "Required for automated direct API push."
            }
          />

          <div className="rounded bg-primary/10 p-3 text-xs text-muted space-y-1">
            <p className="font-semibold text-primary">No API token handy?</p>
            <p>
              You can still use the <strong>&quot;Open in LinkedIn&quot;</strong> and <strong>&quot;Copy Text&quot;</strong> buttons to push instantly with zero setup.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettingsModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSaveSettings}
              disabled={isSavingSettings}
            >
              {isSavingSettings ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                "Save Credentials"
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
