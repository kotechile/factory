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
  Wand2,
  Lock,
  LogOut,
  ShieldCheck,
  Eye,
  Edit3,
  Bookmark,
} from "lucide-react";

const SAMPLE_ARTICLE = {
  title: "The 2026 QBI Tax Misconception: Why 23% Underfunds Your Estimated Tax",
  sourceUrl: "https://factory.aichieve.net/quarterline",
  tags: "Tax, SmallBusiness, Freelance, Accounting, OBBBA",
  content: `# The 2026 QBI Tax Misconception: Why 23% Underfunds Your Estimated Tax

For U.S. freelancers, single-member LLCs, and Schedule C filers, the 2026 tax year marks a historic shift in federal tax accounting under the One Big Beautiful Bill Act (OBBBA, Pub. L. 119-21).

However, widespread misinformation across published guides has introduced an acute financial trap ahead of quarterly estimated tax deadlines: the misconception that the Section 199A Qualified Business Income (QBI) deduction rate was increased to 23%.

---

## 1. The Statutory 20% QBI Deduction (Debunking the 23% House Draft Myth)

During legislative drafting, an initial House proposal floated an increase of the Section 199A deduction from 20% to 23%. Several tax blogs rushed to publish guidance advising filers to recalculate their estimates.

**The Reality:** The enacted statute (Pub. L. 119-21) permanently locked Section 199A at the statutory **20% rate**.

### The Underpayment Trap:
If a sole proprietor netting $150,000 calculates their estimated payment assuming a 23% deduction ($34,500) rather than the enacted 20% deduction ($30,000), their estimated tax liability is underfunded by thousands of dollars, triggering IRS Section 6654 underpayment interest penalties.

---

## 2. Updated 2026 Thresholds (Rev. Proc. 2025-32)

Under 2026 statutory inflation adjustments:
* **Single Filers:** Threshold begins at **$201,750**, with a phase-in band widened to **$75,000** (fully phased out at $276,750 for SSTBs).
* **Married Filing Jointly:** Threshold begins at **$403,500**, with a phase-in band widened to **$150,000** (fully phased out at $553,500 for SSTBs).

---

## 3. Safe Harbor Rules for Estimated Payments

To avoid penalties on quarterly estimated installments, filers must satisfy one of the two statutory Safe Harbor benchmarks:
* **100% Rule:** Pay 100% of the prior year's (2025) total tax liability in 4 equal quarterly installments.
* **110% High-Income Rule:** If prior-year AGI exceeded $150,000, safe-harbor increases to **110%** of prior-year tax.

---

## Summary & Verification
Deterministic verification beats guesswork. Verify your exact 2026 self-employment tax and Section 199A deductions with the open engine at factory.aichieve.net/quarterline.`,
};

/**
 * Lightweight markdown renderer for crisp typography in the Rendered View
 */
function MarkdownReader({ content }: { content: string }) {
  if (!content) return <p className="text-muted italic">No content to preview.</p>;

  const elements: React.ReactNode[] = [];
  const lines = content.split("\n");
  let currentList: string[] = [];
  let inList = false;

  function flushList() {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="my-3 list-disc space-y-1.5 pl-6 text-muted">
          {currentList.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ul>,
      );
      currentList = [];
      inList = false;
    }
  }

  function renderInline(text: string): React.ReactNode {
    // Basic bold parsing: **text**
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-semibold text-foreground">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  }

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
      inList = true;
      currentList.push(trimmed.slice(2));
      return;
    } else if (inList) {
      flushList();
    }

    if (!trimmed) {
      return;
    }

    if (trimmed.startsWith("# ")) {
      elements.push(
        <h1
          key={index}
          className="mt-6 mb-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl first:mt-0"
        >
          {renderInline(trimmed.slice(2))}
        </h1>,
      );
    } else if (trimmed.startsWith("## ")) {
      elements.push(
        <h2
          key={index}
          className="mt-6 mb-2 text-xl font-bold tracking-tight text-foreground border-b border-border/60 pb-1.5"
        >
          {renderInline(trimmed.slice(3))}
        </h2>,
      );
    } else if (trimmed.startsWith("### ")) {
      elements.push(
        <h3 key={index} className="mt-4 mb-1.5 text-base font-semibold text-foreground">
          {renderInline(trimmed.slice(4))}
        </h3>,
      );
    } else if (trimmed === "---") {
      elements.push(<hr key={index} className="my-6 border-border" />);
    } else if (trimmed.startsWith("> ")) {
      elements.push(
        <blockquote
          key={index}
          className="my-3 border-l-4 border-primary pl-4 py-1 italic text-muted bg-primary/5 rounded-r"
        >
          {renderInline(trimmed.slice(2))}
        </blockquote>,
      );
    } else {
      elements.push(
        <p key={index} className="my-3 leading-relaxed text-muted">
          {renderInline(trimmed)}
        </p>,
      );
    }
  });

  flushList();

  return <div className="space-y-1">{elements}</div>;
}

export default function PressFlowPage() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = React.useState<boolean>(true);
  const [enteredPasscode, setEnteredPasscode] = React.useState<string>("");
  const [authError, setAuthError] = React.useState<string>("");
  const [isSubmittingAuth, setIsSubmittingAuth] = React.useState<boolean>(false);

  // Article form state
  const [title, setTitle] = React.useState(SAMPLE_ARTICLE.title);
  const [content, setContent] = React.useState(SAMPLE_ARTICLE.content);
  const [sourceUrl, setSourceUrl] = React.useState(SAMPLE_ARTICLE.sourceUrl);
  const [tagsInput, setTagsInput] = React.useState(SAMPLE_ARTICLE.tags);
  const [currentArticleId, setCurrentArticleId] = React.useState<string | null>(null);
  const [articleViewMode, setArticleViewMode] = React.useState<"rendered" | "edit">("rendered");

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
  const [showGenerateModal, setShowGenerateModal] = React.useState<boolean>(false);

  // Generate Suite state
  const [generateProduct, setGenerateProduct] = React.useState<string>("quarterline");
  const [generateCustomTopic, setGenerateCustomTopic] = React.useState<string>("");
  const [isGeneratingSuite, setIsGeneratingSuite] = React.useState<boolean>(false);

  // Settings & Credentials state
  const [authorUrn, setAuthorUrn] = React.useState<string>("");
  const [accessToken, setAccessToken] = React.useState<string>("");
  const [hasConfiguredCredentials, setHasConfiguredCredentials] = React.useState<boolean>(false);
  const [isSavingSettings, setIsSavingSettings] = React.useState<boolean>(false);

  // Check authentication session on mount
  React.useEffect(() => {
    async function checkAuthStatus() {
      setIsCheckingAuth(true);
      try {
        const res = await fetch("/api/auth/editorial");
        const data = await res.json();
        if (data.authenticated) {
          setIsAuthenticated(true);
          loadArticles();
          loadPosts();
          loadLinkedInConfig();
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        setIsAuthenticated(false);
      } finally {
        setIsCheckingAuth(false);
      }
    }
    checkAuthStatus();
  }, []);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (!enteredPasscode.trim()) return;
    setIsSubmittingAuth(true);
    setAuthError("");

    try {
      const res = await fetch("/api/auth/editorial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: enteredPasscode }),
      });
      const data = await res.json();

      if (data.success) {
        setIsAuthenticated(true);
        setNotification({ type: "success", message: "Welcome to Editorial Factory!" });
        loadArticles();
        loadPosts();
        loadLinkedInConfig();
      } else {
        setAuthError(data.error || "Incorrect passcode.");
      }
    } catch {
      setAuthError("Network error attempting to unlock.");
    } finally {
      setIsSubmittingAuth(false);
    }
  }

  async function handleLock() {
    try {
      await fetch("/api/auth/editorial", { method: "DELETE" });
      setIsAuthenticated(false);
      setEnteredPasscode("");
      setNotification({ type: "success", message: "Editorial session locked." });
    } catch {
      setIsAuthenticated(false);
    }
  }

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

  async function handleGenerateContentSuite() {
    setIsGeneratingSuite(true);
    try {
      const res = await fetch("/api/articles/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productSlug: generateProduct,
          topic: generateCustomTopic,
        }),
      });

      const data = await res.json();
      if (data.success && data.article) {
        handleSelectArticle(data.article);
        loadArticles();
        loadPosts();
        setShowGenerateModal(false);
        setNotification({
          type: "success",
          message: "🎉 Long-form pillar article & companion LinkedIn posts generated and stored in Supabase!",
        });
      } else {
        throw new Error(data.error || "Generation failed");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate suite";
      setNotification({ type: "error", message: msg });
    } finally {
      setIsGeneratingSuite(false);
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
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  // If loading authentication state
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <RefreshCw className="h-6 w-6 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted">Checking security authorization...</p>
        </div>
      </div>
    );
  }

  // Locked Login Screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center shadow-xs">
              <Lock className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Editorial Factory
            </h1>
            <p className="text-xs uppercase tracking-wider font-semibold text-subtle">
              Restricted Founder &amp; Agent Workspace
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <Input
              label="Editorial Passcode"
              type="password"
              placeholder="Enter access passcode"
              value={enteredPasscode}
              onChange={(e) => {
                setEnteredPasscode(e.target.value);
                setAuthError("");
              }}
              error={authError}
              helperText="Configured in EDITORIAL_SECRET environment variable."
            />

            <Button
              type="submit"
              variant="default"
              size="md"
              disabled={isSubmittingAuth || !enteredPasscode.trim()}
              className="w-full gap-2 rounded-xl"
            >
              {isSubmittingAuth ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Unlock Workbench
                </>
              )}
            </Button>
          </form>

          <div className="pt-2 text-center text-[11px] text-subtle border-t border-border">
            <span>editorial-factory.aichieve.net • 30-Day Session Protected</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 font-sans">
      {/* Top Banner / Toast */}
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
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Header Bar */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
                <Share2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-subtle">
                  Editorial Factory Suite
                </p>
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  PressFlow
                </h1>
              </div>
              <div className="ml-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success/10 text-success border border-success/20 text-xs font-medium">
                <Database className="h-3 w-3" />
                <span>{isSupabaseConnected ? "Supabase Connected" : "Supabase Offline"}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowGenerateModal(true)}
              className="gap-1.5 rounded-xl shadow-xs"
            >
              <Wand2 className="h-4 w-4" />
              Generate Suite
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistoryModal(true)}
              className="gap-1.5 rounded-xl"
            >
              <BookOpen className="h-4 w-4 text-primary" />
              Library ({articles.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadSampleData}
              className="gap-1.5 rounded-xl"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              Load Sample
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettingsModal(true)}
              className="gap-1.5 rounded-xl"
            >
              <Settings className="h-4 w-4 text-muted" />
              Settings
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLock}
              className="gap-1.5 text-muted hover:text-destructive rounded-xl"
              title="Lock session"
            >
              <LogOut className="h-4 w-4" />
              Lock
            </Button>
          </div>
        </header>

        {/* SECTION 1: Source Article Workspace (Full-Width Top Card) */}
        <section className="bg-card rounded-2xl border border-border shadow-sm p-6 sm:p-8 space-y-6">
          {/* Card Header & Controls */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-5">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-subtle flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-primary" />
                Source Article Workspace
              </span>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                {title || "Untitled Pillar Article"}
              </h2>
            </div>

            {/* macOS-style Segmented Control Toggle: Rendered View vs Edit Markdown */}
            <div className="bg-muted/10 p-1 rounded-xl flex items-center gap-1 border border-border/50 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setArticleViewMode("rendered")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  articleViewMode === "rendered"
                    ? "bg-card shadow-xs text-foreground font-semibold"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <Eye className="h-3.5 w-3.5 text-primary" />
                Rendered View
              </button>
              <button
                type="button"
                onClick={() => setArticleViewMode("edit")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  articleViewMode === "edit"
                    ? "bg-card shadow-xs text-foreground font-semibold"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <Edit3 className="h-3.5 w-3.5 text-primary" />
                Edit Markdown
              </button>
            </div>
          </div>

          {/* Tidy Meta Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-background/60 rounded-xl p-3 border border-border/60">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-foreground flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-subtle" />
                {wordCount} words (~{readingTimeMinutes} min read)
              </span>

              {sourceUrl && (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary hover:underline"
                >
                  <Globe className="h-3 w-3" />
                  <span className="max-w-[200px] truncate">{sourceUrl}</span>
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}

              {tagsInput && (
                <div className="flex flex-wrap gap-1">
                  {tagsInput.split(",").map((t, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-muted/10 text-muted text-[11px] font-mono"
                    >
                      #{t.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {currentArticleId && (
              <Badge variant="muted" className="text-[10px] font-mono">
                Saved ID: {currentArticleId.slice(0, 8)}...
              </Badge>
            )}
          </div>

          {/* Content Area */}
          {articleViewMode === "rendered" ? (
            <div className="max-w-3xl mx-auto py-2 px-1">
              <MarkdownReader content={content} />
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Article Title"
                  placeholder="e.g. 2026 Tax Strategy"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setIsCustomEdited(false);
                  }}
                />
                <Input
                  label="Source URL"
                  placeholder="https://factory.aichieve.net/quarterline"
                  value={sourceUrl}
                  onChange={(e) => {
                    setSourceUrl(e.target.value);
                    setIsCustomEdited(false);
                  }}
                />
                <Input
                  label="Topic Tags (comma-separated)"
                  placeholder="Tax, Accounting, SaaS"
                  value={tagsInput}
                  onChange={(e) => {
                    setTagsInput(e.target.value);
                    setIsCustomEdited(false);
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="markdown-editor"
                  className="text-xs font-semibold uppercase tracking-wider text-subtle"
                >
                  Markdown Content
                </label>
                <textarea
                  id="markdown-editor"
                  rows={14}
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    setIsCustomEdited(false);
                  }}
                  className="w-full rounded-xl border border-border bg-background/50 p-4 text-sm font-mono leading-relaxed text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  placeholder="Paste or write full markdown article here..."
                />
              </div>
            </div>
          )}

          {/* Workspace Footer Action Bar */}
          <div className="flex items-center justify-between pt-4 border-t border-border/80">
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
              className="rounded-xl"
            >
              Clear Workspace
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={handleSaveArticle}
              disabled={isSavingArticle || !title || !content}
              className="gap-1.5 rounded-xl shadow-xs"
            >
              {isSavingArticle ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Database className="h-4 w-4" />
              )}
              Save Article to Supabase
            </Button>
          </div>
        </section>

        {/* SECTION 2: Companion Social Suite (Full-Width Bottom Card) */}
        <section className="bg-card rounded-2xl border border-border shadow-sm p-6 sm:p-8 space-y-6">
          {/* Card Header & Segmented Variant Control */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-5">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-subtle flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" />
                Companion Social Distribution Suite
              </span>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                LinkedIn Format Generator &amp; Publisher
              </h2>
            </div>

            {/* Segmented Variant Controls */}
            <div className="bg-muted/10 p-1 rounded-xl flex flex-wrap items-center gap-1 border border-border/50">
              <button
                type="button"
                onClick={() => {
                  setSelectedVariant("bullet_takeaways");
                  setIsCustomEdited(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedVariant === "bullet_takeaways" && !isCustomEdited
                    ? "bg-card shadow-xs text-foreground font-semibold"
                    : "text-muted hover:text-foreground"
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
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedVariant === "hook_and_punchline" && !isCustomEdited
                    ? "bg-card shadow-xs text-foreground font-semibold"
                    : "text-muted hover:text-foreground"
                }`}
              >
                ⚡ Contrarian Hook
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedVariant("story_lesson");
                  setIsCustomEdited(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedVariant === "story_lesson" && !isCustomEdited
                    ? "bg-card shadow-xs text-foreground font-semibold"
                    : "text-muted hover:text-foreground"
                }`}
              >
                📖 Story &amp; Lessons
              </button>
            </div>
          </div>

          {/* Two Equal Columns: Left = Editable Draft, Right = Live Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Left Column: Editable Draft */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-subtle">
                    Post Draft &amp; Composition
                  </span>
                  {isCustomEdited && (
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                      Custom edited
                    </span>
                  )}
                </div>

                {/* Character Counter Progress */}
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-mono font-medium ${
                      isOverLimit ? "text-destructive" : "text-subtle"
                    }`}
                  >
                    {charCount} / 3,000
                  </span>
                  <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
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

              <textarea
                id="linkedin-post-draft"
                rows={14}
                value={activePostText}
                onChange={(e) => {
                  setIsCustomEdited(true);
                  setCustomText(e.target.value);
                }}
                className="w-full rounded-xl border border-border bg-background/50 p-4 text-sm leading-relaxed text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                placeholder="Formatted post text will appear here..."
              />

              <div className="flex items-center justify-between text-xs text-subtle pt-1">
                <span>Formatted with normalized hashtags and line breaks</span>
                {isCustomEdited && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomEdited(false);
                      setCustomText("");
                    }}
                    className="text-primary hover:underline font-medium"
                  >
                    Reset to Generated
                  </button>
                )}
              </div>
            </div>

            {/* Right Column: Realistic LinkedIn Feed Preview Card */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-subtle">
                  LinkedIn Feed Live Preview
                </span>
                <span className="text-[11px] text-subtle flex items-center gap-1">
                  <Globe className="h-3 w-3" /> Public Member Visibility
                </span>
              </div>

              {/* Feed Card */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
                {/* Author Bar */}
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-primary flex items-center justify-center text-card font-bold text-sm shadow-xs">
                    SF
                  </div>
                  <div className="leading-tight">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-foreground">
                        Software Factory
                      </span>
                      <span className="text-[11px] text-subtle">• 1st</span>
                    </div>
                    <p className="text-xs text-muted">
                      Autonomous Product &amp; Engineering Engine
                    </p>
                    <div className="flex items-center gap-1 text-[11px] text-subtle mt-0.5">
                      <span>Just now</span>
                      <span>•</span>
                      <Globe className="h-2.5 w-2.5 inline" />
                    </div>
                  </div>
                </div>

                {/* Post Body */}
                <div className="text-sm text-foreground whitespace-pre-line leading-relaxed font-sans">
                  {activePostText}
                </div>

                {/* Embedded URL Preview */}
                {sourceUrl && (
                  <div className="rounded-xl border border-border bg-background/50 p-3 space-y-1">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {title || "Verified Calculation Engine"}
                    </p>
                    <p className="text-[11px] text-subtle truncate">{sourceUrl}</p>
                  </div>
                )}

                {/* Action Bar */}
                <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted font-medium">
                  <button
                    type="button"
                    className="flex items-center gap-1.5 hover:text-foreground transition-colors p-1"
                  >
                    <ThumbsUp className="h-4 w-4" />
                    <span>Like</span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 hover:text-foreground transition-colors p-1"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Comment</span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 hover:text-foreground transition-colors p-1"
                  >
                    <Repeat className="h-4 w-4" />
                    <span>Repost</span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 hover:text-foreground transition-colors p-1"
                  >
                    <Send className="h-4 w-4" />
                    <span>Send</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Social Suite Footer Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-border/80">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-1.5 rounded-xl flex-1 sm:flex-initial"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-success" />
                    Copied to Clipboard!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy to Clipboard
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenInLinkedIn}
                className="gap-1.5 rounded-xl flex-1 sm:flex-initial"
                title="Open in LinkedIn Composer"
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
                className="gap-1.5 rounded-xl flex-1 sm:flex-initial"
              >
                <Bookmark className="h-4 w-4 text-subtle" />
                Queue Draft
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={handlePushToLinkedIn}
                disabled={isPublishing || !activePostText || isOverLimit}
                className="gap-1.5 rounded-xl shadow-xs flex-1 sm:flex-initial"
              >
                {isPublishing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Push to LinkedIn Now
                  </>
                )}
              </Button>
            </div>
          </div>
        </section>

        {/* SECTION 3: Supabase Queue & Distribution History */}
        <section className="bg-card rounded-2xl border border-border shadow-sm p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-subtle flex items-center gap-1.5">
                <Database className="h-4 w-4 text-primary" />
                Supabase Distribution Queue &amp; History
              </span>
              <h3 className="text-lg font-bold text-foreground">
                Persistent Distribution Log
              </h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadPosts}
              className="gap-1 text-xs rounded-xl"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>

          {posts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted text-sm">
              <Database className="h-8 w-8 mx-auto text-subtle/50 mb-2" />
              No posts stored in Supabase yet. Click &quot;Queue Draft&quot; or &quot;Push to LinkedIn&quot; to save records.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {posts.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-border bg-background/50 p-4 space-y-3 shadow-xs flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          p.status === "published"
                            ? "bg-success/10 text-success border border-success/20"
                            : p.status === "failed"
                            ? "bg-destructive/10 text-destructive border border-destructive/20"
                            : p.status === "publishing"
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : "bg-muted/10 text-muted border border-border"
                        }`}
                      >
                        {p.status.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-subtle flex items-center gap-1 font-mono">
                        <Clock className="h-3 w-3" />
                        {new Date(p.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-foreground line-clamp-4 whitespace-pre-line font-sans leading-relaxed">
                      {p.content}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-subtle">
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

      {/* Generate Suite Modal */}
      <Modal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        title="Generate Long-Form Article & Post Suite"
        description="Automatically create a comprehensive technical pillar article and companion LinkedIn posts."
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-background p-4 text-xs space-y-1 text-muted">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
              Automated Synthesis Engine
            </p>
            <p>
              Generates a full 1,000+ word structured markdown article with citations, plus 3 optimized LinkedIn post variants stored directly in Supabase.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-subtle">
              Select Product / Model
            </label>
            <select
              value={generateProduct}
              onChange={(e) => setGenerateProduct(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <option value="quarterline">QuarterLine (2026 Tax &amp; QBI Blueprint)</option>
              <option value="custom">Custom Topic / PRD</option>
            </select>
          </div>

          {generateProduct === "custom" && (
            <Input
              label="Custom Topic / Prompt"
              placeholder="e.g. AI-driven financial modeling for solo founders"
              value={generateCustomTopic}
              onChange={(e) => setGenerateCustomTopic(e.target.value)}
              helperText="Brief summary or topic for the long-form pillar article."
            />
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGenerateModal(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleGenerateContentSuite}
              disabled={isGeneratingSuite}
              className="gap-1.5 rounded-xl shadow-xs"
            >
              {isGeneratingSuite ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Generating Suite...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Generate &amp; Save
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

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
              <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
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
                className="rounded-xl border border-border bg-background p-4 hover:border-primary/50 cursor-pointer transition-colors space-y-2"
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
          <div className="rounded-xl border border-border bg-background p-4 text-xs space-y-1 text-muted">
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

          <div className="rounded-xl bg-primary/10 p-3.5 text-xs text-muted space-y-1">
            <p className="font-semibold text-primary">No API token handy?</p>
            <p>
              You can still use the <strong>&quot;Open in LinkedIn&quot;</strong> and <strong>&quot;Copy Text&quot;</strong> buttons to push instantly with zero setup.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettingsModal(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSaveSettings}
              disabled={isSavingSettings}
              className="rounded-xl shadow-xs"
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
