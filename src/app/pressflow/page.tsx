"use client";

import * as React from "react";
import {
  formatArticleForDistribution,
  buildRedditSubmitUrl,
  type PostFormatVariant,
  type RedditPostVariant,
  type DistributionAnalysis,
} from "@/lib/calc/content-distributor/engine";
import { buildLinkedInShareUrl } from "@/lib/articles/linkedin";
import type {
  Article,
  LinkedInPost,
  DistributionTask,
  DistributionTaskStatus,
  DistributionSourceType,
  DistributionPlatform,
} from "@/lib/articles/types";
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
  ListTodo,
  Plus,
  RotateCcw,
  XCircle,
  Layers,
  Tag,
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
          className="mt-5 mb-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl"
        >
          {renderInline(trimmed.slice(3))}
        </h2>,
      );
    } else if (trimmed.startsWith("### ")) {
      elements.push(
        <h3 key={index} className="mt-4 mb-2 text-lg font-semibold text-foreground">
          {renderInline(trimmed.slice(4))}
        </h3>,
      );
    } else if (trimmed === "---") {
      elements.push(<hr key={index} className="my-6 border-border" />);
    } else {
      elements.push(
        <p key={index} className="my-2.5 text-sm leading-relaxed text-muted sm:text-base">
          {renderInline(trimmed)}
        </p>,
      );
    }
  });

  if (inList) {
    flushList();
  }

  return <div className="space-y-1">{elements}</div>;
}

export default function PressFlowPage() {
  // Navigation State
  const [activeTab, setActiveTab] = React.useState<"todos" | "editor">("todos");

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = React.useState<boolean>(true);
  const [enteredPasscode, setEnteredPasscode] = React.useState<string>("");
  const [authError, setAuthError] = React.useState<string>("");
  const [isSubmittingAuth, setIsSubmittingAuth] = React.useState<boolean>(false);

  // Distribution To-Dos State
  const [distributionTasks, setDistributionTasks] = React.useState<DistributionTask[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = React.useState<boolean>(false);
  const [taskStatusFilter, setTaskStatusFilter] = React.useState<DistributionTaskStatus | "all">("ready_to_publish");
  const [taskSourceFilter, setTaskSourceFilter] = React.useState<"all" | "software" | "article" | "manual">("all");
  const [taskPlatformFilter, setTaskPlatformFilter] = React.useState<"all" | "reddit" | "linkedin">("all");
  const [isGeneratingBatch, setIsGeneratingBatch] = React.useState<boolean>(false);
  const [copiedTaskId, setCopiedTaskId] = React.useState<string | null>(null);

  // New Manual Task Modal
  const [showNewTaskModal, setShowNewTaskModal] = React.useState<boolean>(false);
  const [newTaskSourceType, setNewTaskSourceType] = React.useState<DistributionSourceType>("manual");
  const [newTaskSourceTitle, setNewTaskSourceTitle] = React.useState<string>("");
  const [newTaskPlatform, setNewTaskPlatform] = React.useState<DistributionPlatform>("reddit");
  const [newTaskChannel, setNewTaskChannel] = React.useState<string>("r/SideProject");
  const [newTaskTitle, setNewTaskTitle] = React.useState<string>("");
  const [newTaskContent, setNewTaskContent] = React.useState<string>("");
  const [isSavingNewTask, setIsSavingNewTask] = React.useState<boolean>(false);

  // Article form state
  const [title, setTitle] = React.useState(SAMPLE_ARTICLE.title);
  const [content, setContent] = React.useState(SAMPLE_ARTICLE.content);
  const [sourceUrl, setSourceUrl] = React.useState(SAMPLE_ARTICLE.sourceUrl);
  const [tagsInput, setTagsInput] = React.useState(SAMPLE_ARTICLE.tags);
  const [currentArticleId, setCurrentArticleId] = React.useState<string | null>(null);
  const [articleViewMode, setArticleViewMode] = React.useState<"rendered" | "edit">("rendered");

  // Post format studio state
  const [postPlatformTab, setPostPlatformTab] = React.useState<"reddit" | "linkedin">("reddit");
  const [selectedVariant, setSelectedVariant] = React.useState<PostFormatVariant>("bullet_takeaways");
  const [selectedRedditVariant, setSelectedRedditVariant] = React.useState<RedditPostVariant>("math_breakdown");
  const [customText, setCustomText] = React.useState<string>("");
  const [isCustomEdited, setIsCustomEdited] = React.useState<boolean>(false);
  const [selectedSubreddit, setSelectedSubreddit] = React.useState<string>("tax");

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
          loadDistributionTasks();
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

  // Compute live distribution analysis
  const analysis: DistributionAnalysis = React.useMemo(() => {
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    return formatArticleForDistribution({
      title,
      content,
      sourceUrl: sourceUrl || undefined,
      tags,
    });
  }, [title, content, sourceUrl, tagsInput]);

  // Sync selected subreddit when analysis changes
  React.useEffect(() => {
    if (analysis.recommendedSubreddits && analysis.recommendedSubreddits[0]) {
      setSelectedSubreddit(analysis.recommendedSubreddits[0]);
    }
  }, [analysis]);

  // Active post text for LinkedIn editor
  const activePostText = isCustomEdited
    ? customText
    : analysis.variants[selectedVariant]?.postText || "";

  // Active Reddit post text & submit URL
  const activeRedditPost = analysis.redditVariants[selectedRedditVariant];
  const activeRedditSubmitUrl = React.useMemo(() => {
    if (!activeRedditPost) return "";
    return buildRedditSubmitUrl(selectedSubreddit, activeRedditPost.title, activeRedditPost.postText);
  }, [selectedSubreddit, activeRedditPost]);

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
        loadDistributionTasks();
        loadArticles();
        loadPosts();
        loadLinkedInConfig();
        setNotification({ type: "success", message: "Workbench unlocked successfully!" });
      } else {
        setAuthError(data.error || "Invalid editorial passcode.");
      }
    } catch {
      setAuthError("Authentication request failed. Please check network connection.");
    } finally {
      setIsSubmittingAuth(false);
    }
  }

  async function handleLock() {
    try {
      await fetch("/api/auth/editorial", { method: "DELETE" });
      setIsAuthenticated(false);
      setNotification({ type: "success", message: "Session locked." });
    } catch {
      setIsAuthenticated(false);
    }
  }

  async function loadDistributionTasks() {
    setIsLoadingTasks(true);
    try {
      const res = await fetch("/api/distribution/tasks?status=all");
      const data = await res.json();
      if (data.success) {
        setDistributionTasks(data.tasks || []);
      }
    } catch (err) {
      console.error("Failed to load distribution tasks:", err);
    } finally {
      setIsLoadingTasks(false);
    }
  }

  async function loadArticles() {
    setIsLoadingArticles(true);
    try {
      const res = await fetch("/api/articles");
      const data = await res.json();
      if (data.success) {
        setArticles(data.articles || []);
        setIsSupabaseConnected(true);
      } else {
        setIsSupabaseConnected(false);
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
      if (data.success) {
        setPosts(data.posts || []);
      }
    } catch (err) {
      console.warn("Failed to load posts:", err);
    }
  }

  async function loadLinkedInConfig() {
    try {
      const res = await fetch("/api/linkedin/config");
      const data = await res.json();
      if (data.success && data.config) {
        setAuthorUrn(data.config.author_urn || "");
        setHasConfiguredCredentials(Boolean(data.config.hasToken));
      }
    } catch (err) {
      console.warn("Failed to load config:", err);
    }
  }

  async function handleUpdateTaskStatus(id: string, newStatus: DistributionTaskStatus) {
    // Optimistic update
    setDistributionTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus, updated_at: new Date().toISOString() } : t)),
    );

    try {
      const res = await fetch("/api/distribution/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      loadDistributionTasks();
    }
  }

  async function handleDeleteTask(id: string, permanent = false) {
    if (permanent) {
      setDistributionTasks((prev) => prev.filter((t) => t.id !== id));
    } else {
      setDistributionTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: "deleted" } : t)),
      );
    }

    try {
      await fetch(`/api/distribution/tasks?id=${id}&permanent=${permanent}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("Failed to delete task:", err);
      loadDistributionTasks();
    }
  }

  async function handleGenerateWeeklyBatch() {
    setIsGeneratingBatch(true);
    try {
      const res = await fetch("/api/distribution/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_weekly_batch" }),
      });
      const data = await res.json();
      if (data.success) {
        setNotification({
          type: "success",
          message: `🎉 Generated ${data.tasks?.length || 0} distribution tasks for Software & Articles!`,
        });
        await loadDistributionTasks();
      } else {
        throw new Error(data.error || "Batch generation failed");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error generating batch";
      setNotification({ type: "error", message: msg });
    } finally {
      setIsGeneratingBatch(false);
    }
  }

  async function handleCreateManualTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskContent.trim() || !newTaskChannel.trim()) {
      setNotification({ type: "error", message: "Please fill in title, channel, and content." });
      return;
    }

    setIsSavingNewTask(true);
    try {
      const isReddit = newTaskPlatform === "reddit";
      const cleanSub = newTaskChannel.replace(/^r\//i, "").trim();
      const submitUrl = isReddit
        ? buildRedditSubmitUrl(cleanSub, newTaskTitle, newTaskContent)
        : undefined;

      const res = await fetch("/api/distribution/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_type: newTaskSourceType,
          source_title: newTaskSourceTitle || "Custom Item",
          platform: newTaskPlatform,
          channel: newTaskChannel,
          post_title: newTaskTitle,
          post_content: newTaskContent,
          submit_url: submitUrl,
          status: "ready_to_publish",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setNotification({ type: "success", message: "Task added to distribution queue!" });
        setShowNewTaskModal(false);
        setNewTaskTitle("");
        setNewTaskContent("");
        setNewTaskSourceTitle("");
        loadDistributionTasks();
      } else {
        throw new Error(data.error || "Failed to create task");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error saving task";
      setNotification({ type: "error", message: msg });
    } finally {
      setIsSavingNewTask(false);
    }
  }

  async function handleQueueArticleForDistribution() {
    if (!title || !content) return;

    try {
      // 1. Queue Reddit Task
      const redditSub = selectedSubreddit || "SideProject";
      const redditTitle = activeRedditPost?.title || `Breakdown: ${title}`;
      const redditBody = activeRedditPost?.postText || content;
      const redditUrl = buildRedditSubmitUrl(redditSub, redditTitle, redditBody);

      await fetch("/api/distribution/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_type: "article",
          source_id: currentArticleId || undefined,
          source_title: title,
          platform: "reddit",
          channel: `r/${redditSub}`,
          post_title: redditTitle,
          post_content: redditBody,
          submit_url: redditUrl,
          status: "ready_to_publish",
        }),
      });

      // 2. Queue LinkedIn Task
      await fetch("/api/distribution/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_type: "article",
          source_id: currentArticleId || undefined,
          source_title: title,
          platform: "linkedin",
          channel: "Feed",
          post_title: `LinkedIn: ${title}`,
          post_content: activePostText,
          submit_url: sourceUrl
            ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(sourceUrl)}`
            : undefined,
          status: "ready_to_publish",
        }),
      });

      setNotification({
        type: "success",
        message: "✅ Queued Reddit & LinkedIn tasks to your Weekly To-Do list!",
      });
      loadDistributionTasks();
    } catch {
      setNotification({ type: "error", message: "Failed to queue distribution tasks." });
    }
  }

  async function handleSaveArticle() {
    if (!title.trim() || !content.trim()) {
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
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNotification({ type: "success", message: "🚀 Published successfully to LinkedIn!" });
        loadPosts();
      } else {
        throw new Error(data.error || "LinkedIn API publish failed");
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
        loadDistributionTasks();
        setShowGenerateModal(false);
        setNotification({
          type: "success",
          message: "🎉 Long-form pillar article & distribution tasks generated and stored in Supabase!",
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

  function handleCopy(text: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function handleCopyTaskText(id: string, text: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedTaskId(id);
    setTimeout(() => setCopiedTaskId(null), 2500);
  }

  function handleOpenInLinkedIn() {
    const url = buildLinkedInShareUrl(activePostText, sourceUrl || undefined);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleOpenRedditSubmit() {
    if (activeRedditSubmitUrl) {
      window.open(activeRedditSubmitUrl, "_blank", "noopener,noreferrer");
    }
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
    setActiveTab("editor");
    setNotification({ type: "success", message: `Loaded: "${art.title}"` });
  }

  async function handleDeleteArticle(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await fetch(`/api/articles?id=${id}`, { method: "DELETE" });
      setNotification({ type: "success", message: "Article deleted." });
      loadArticles();
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
    setActiveTab("editor");
    setNotification({ type: "success", message: "Loaded 2026 Tax Article sample." });
  }

  // Filtered To-Do tasks
  const filteredTasks = React.useMemo(() => {
    return distributionTasks.filter((task) => {
      if (taskStatusFilter !== "all" && task.status !== taskStatusFilter) return false;
      if (taskSourceFilter !== "all" && task.source_type !== taskSourceFilter) return false;
      if (taskPlatformFilter !== "all" && task.platform !== taskPlatformFilter) return false;
      return true;
    });
  }, [distributionTasks, taskStatusFilter, taskSourceFilter, taskPlatformFilter]);

  // Counts for summary metrics
  const readyCount = distributionTasks.filter((t) => t.status === "ready_to_publish").length;
  const doneCount = distributionTasks.filter((t) => t.status === "done").length;
  const deletedCount = distributionTasks.filter((t) => t.status === "deleted").length;

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
            <span>pressflow.aichieve.net • Session Protected</span>
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
                  Autonomous Distribution Engine
                </p>
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  PressFlow
                </h1>
              </div>
              <div className="ml-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success/10 text-success border border-success/20 text-xs font-medium">
                <Database className="h-3 w-3" />
                <span>{isSupabaseConnected ? "Connected" : "Local Mode"}</span>
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
              Articles ({articles.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadSampleData}
              className="gap-1.5 rounded-xl"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              Sample
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

        {/* Global Navigation Tabs (Weekly To-Dos vs Article Studio) */}
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("todos")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "todos"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted hover:text-foreground hover:bg-muted/10"
            }`}
          >
            <ListTodo className="h-4 w-4" />
            <span>Weekly Distribution To-Dos</span>
            {readyCount > 0 && (
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                  activeTab === "todos"
                    ? "bg-background/20 text-primary-foreground"
                    : "bg-success/10 text-success border border-success/20"
                }`}
              >
                {readyCount} ready
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("editor")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "editor"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted hover:text-foreground hover:bg-muted/10"
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Pillar Article &amp; Post Studio</span>
          </button>
        </div>

        {/* VIEW 1: WEEKLY DISTRIBUTION TO-DO QUEUE */}
        {activeTab === "todos" && (
          <div className="space-y-6">
            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-success/20 bg-success/5 p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-success">
                    Ready to Publish
                  </p>
                  <p className="text-2xl font-bold text-foreground mt-0.5">{readyCount}</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-success/10 text-success flex items-center justify-center font-bold">
                  🚀
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-subtle">
                    Done / Published
                  </p>
                  <p className="text-2xl font-bold text-foreground mt-0.5">{doneCount}</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-muted/10 text-foreground flex items-center justify-center font-bold">
                  ✅
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-subtle">
                    Deleted / Archive
                  </p>
                  <p className="text-2xl font-bold text-foreground mt-0.5">{deletedCount}</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-muted/10 text-muted flex items-center justify-center font-bold">
                  🗑️
                </div>
              </div>
            </div>

            {/* Filter & Action Toolbar */}
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-xs">
              {/* Status Filters */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-subtle mr-1">
                  Status:
                </span>
                <button
                  type="button"
                  onClick={() => setTaskStatusFilter("ready_to_publish")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    taskStatusFilter === "ready_to_publish"
                      ? "bg-success/15 text-success font-semibold border border-success/30"
                      : "text-muted hover:text-foreground bg-muted/10"
                  }`}
                >
                  🚀 Ready to Publish ({readyCount})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskStatusFilter("done")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    taskStatusFilter === "done"
                      ? "bg-primary/15 text-primary font-semibold border border-primary/30"
                      : "text-muted hover:text-foreground bg-muted/10"
                  }`}
                >
                  ✅ Done ({doneCount})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskStatusFilter("deleted")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    taskStatusFilter === "deleted"
                      ? "bg-destructive/15 text-destructive font-semibold border border-destructive/30"
                      : "text-muted hover:text-foreground bg-muted/10"
                  }`}
                >
                  🗑️ Deleted ({deletedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskStatusFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    taskStatusFilter === "all"
                      ? "bg-card shadow-xs text-foreground font-semibold border border-border"
                      : "text-muted hover:text-foreground bg-muted/10"
                  }`}
                >
                  All ({distributionTasks.length})
                </button>
              </div>

              {/* Source & Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
                <div className="flex items-center gap-1.5 text-xs">
                  <select
                    value={taskSourceFilter}
                    onChange={(e) => setTaskSourceFilter(e.target.value as "all" | "software" | "article" | "manual")}
                    className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus-visible:outline-none"
                  >
                    <option value="all">All Sources</option>
                    <option value="software">🛠️ Software Tools</option>
                    <option value="article">📝 Marketing Articles</option>
                    <option value="manual">✏️ Custom Tasks</option>
                  </select>

                  <select
                    value={taskPlatformFilter}
                    onChange={(e) => setTaskPlatformFilter(e.target.value as "all" | "reddit" | "linkedin")}
                    className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus-visible:outline-none"
                  >
                    <option value="all">All Platforms</option>
                    <option value="reddit">🔴 Reddit</option>
                    <option value="linkedin">🔵 LinkedIn</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNewTaskModal(true)}
                    className="gap-1 text-xs rounded-xl"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New To-Do
                  </Button>

                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleGenerateWeeklyBatch}
                    disabled={isGeneratingBatch}
                    className="gap-1.5 text-xs rounded-xl shadow-xs"
                  >
                    {isGeneratingBatch ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        Generate Weekly Batch
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Task Cards Grid */}
            {isLoadingTasks ? (
              <div className="py-16 text-center text-sm text-muted rounded-2xl border border-dashed border-border bg-card/50">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                Loading distribution tasks...
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="py-16 text-center rounded-2xl border border-dashed border-border bg-card/50 p-8 space-y-3">
                <ListTodo className="h-10 w-10 mx-auto text-subtle/60" />
                <h3 className="text-base font-bold text-foreground">
                  No tasks matching &quot;{taskStatusFilter}&quot;
                </h3>
                <p className="text-xs text-muted max-w-md mx-auto">
                  Click <strong>&quot;Generate Weekly Batch&quot;</strong> to seed distribution to-dos across all active software products (QuarterLine, LedgerLink, PressFlow) and marketing articles.
                </p>
                <div className="pt-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleGenerateWeeklyBatch}
                    className="gap-1.5 rounded-xl shadow-xs"
                  >
                    <Sparkles className="h-4 w-4" />
                    Generate Weekly Batch Now
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredTasks.map((task) => {
                  const isReddit = task.platform === "reddit";
                  const isDone = task.status === "done";
                  const isDeleted = task.status === "deleted";
                  const isReady = task.status === "ready_to_publish";

                  return (
                    <div
                      key={task.id}
                      className={`rounded-2xl border bg-card p-5 shadow-xs flex flex-col justify-between space-y-4 transition-all ${
                        isDone
                          ? "border-border/60 opacity-80"
                          : isDeleted
                          ? "border-destructive/30 bg-destructive/5 opacity-70"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      {/* Top Meta Header */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                isReddit
                                  ? "bg-accent/15 text-accent border border-accent/20"
                                  : "bg-primary/10 text-primary border border-primary/20"
                              }`}
                            >
                              {isReddit ? "🔴" : "🔵"} {task.channel}
                            </span>

                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/10 text-muted text-[10px] font-mono">
                              {task.source_type === "software" ? "🛠️ Software" : "📝 Article"}
                            </span>
                          </div>

                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isReady
                                ? "bg-success/15 text-success border border-success/30"
                                : isDone
                                ? "bg-muted/20 text-muted border border-border"
                                : "bg-destructive/10 text-destructive border border-destructive/20"
                            }`}
                          >
                            {task.status.replace(/_/g, " ")}
                          </span>
                        </div>

                        <div>
                          <p className="text-[11px] text-subtle font-medium">{task.source_title}</p>
                          <h4 className="text-sm font-bold text-foreground leading-snug">
                            {task.post_title}
                          </h4>
                        </div>
                      </div>

                      {/* Content Preview Box */}
                      <div className="rounded-xl border border-border/80 bg-background/60 p-3.5 text-xs text-foreground/90 font-mono leading-relaxed max-h-48 overflow-y-auto whitespace-pre-line">
                        {task.post_content}
                      </div>

                      {/* Action Bar */}
                      <div className="pt-2 border-t border-border/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                        {/* 1-Click Launch & Copy */}
                        <div className="flex items-center gap-1.5 flex-1">
                          {task.submit_url ? (
                            <a
                              href={task.submit_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-xs hover:opacity-95 transition-all flex-1 sm:flex-initial"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              <span>1-Click Submit ({task.channel})</span>
                            </a>
                          ) : (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleCopyTaskText(task.id, task.post_content)}
                              className="gap-1.5 text-xs rounded-xl flex-1 sm:flex-initial"
                            >
                              <Copy className="h-3.5 w-3.5" />
                              Copy Post
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyTaskText(task.id, task.post_content)}
                            className="gap-1 text-xs rounded-xl"
                            title="Copy formatted markdown text"
                          >
                            {copiedTaskId === task.id ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-success" />
                                <span className="text-success font-semibold">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5 text-muted" />
                                <span>Copy Text</span>
                              </>
                            )}
                          </Button>
                        </div>

                        {/* Status Toggles */}
                        <div className="flex items-center justify-end gap-1">
                          {isReady && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUpdateTaskStatus(task.id, "done")}
                                className="gap-1 text-xs text-success hover:bg-success/10 rounded-xl"
                                title="Mark as published/done"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Done</span>
                              </Button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTask(task.id, false)}
                                className="text-muted hover:text-destructive p-1.5 rounded-lg transition-colors"
                                title="Delete task"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}

                          {isDone && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUpdateTaskStatus(task.id, "ready_to_publish")}
                                className="gap-1 text-xs text-primary rounded-xl"
                                title="Move back to ready to publish"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                <span>Re-Open</span>
                              </Button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTask(task.id, false)}
                                className="text-muted hover:text-destructive p-1.5 rounded-lg transition-colors"
                                title="Move to deleted"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}

                          {isDeleted && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUpdateTaskStatus(task.id, "ready_to_publish")}
                                className="gap-1 text-xs text-primary rounded-xl"
                                title="Restore task to ready"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                <span>Restore</span>
                              </Button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTask(task.id, true)}
                                className="text-destructive hover:bg-destructive/10 p-1.5 rounded-lg transition-colors"
                                title="Delete permanently"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: PILLAR ARTICLE & POST STUDIO */}
        {activeTab === "editor" && (
          <div className="space-y-8">
            {/* SECTION 1: Source Article Workspace */}
            <section className="bg-card rounded-2xl border border-border shadow-sm p-6 sm:p-8 space-y-6">
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
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border/80">
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

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleQueueArticleForDistribution}
                    disabled={!title || !content}
                    className="gap-1.5 rounded-xl"
                  >
                    <ListTodo className="h-4 w-4 text-primary" />
                    Queue to Weekly To-Dos
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
                    Save Article
                  </Button>
                </div>
              </div>
            </section>

            {/* SECTION 2: Companion Multi-Platform Distribution Suite */}
            <section className="bg-card rounded-2xl border border-border shadow-sm p-6 sm:p-8 space-y-6">
              {/* Platform Selector Tabs */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-subtle flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Companion Social Distribution Suite
                  </span>
                  <h2 className="text-xl font-bold tracking-tight text-foreground">
                    Multi-Platform Post Generator
                  </h2>
                </div>

                <div className="bg-muted/10 p-1 rounded-xl flex items-center gap-1 border border-border/50">
                  <button
                    type="button"
                    onClick={() => setPostPlatformTab("reddit")}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      postPlatformTab === "reddit"
                        ? "bg-card shadow-xs text-accent border border-accent/20"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    🔴 Reddit Markdown
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostPlatformTab("linkedin")}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      postPlatformTab === "linkedin"
                        ? "bg-card shadow-xs text-primary border border-primary/20"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    🔵 LinkedIn Feed
                  </button>
                </div>
              </div>

              {/* REDDIT TAB CONTENT */}
              {postPlatformTab === "reddit" && (
                <div className="space-y-6">
                  {/* Reddit Format & Subreddit Selector */}
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-background/60 p-4 rounded-xl border border-border/60">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-subtle uppercase tracking-wider mr-1">
                        Format:
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedRedditVariant("math_breakdown")}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          selectedRedditVariant === "math_breakdown"
                            ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                            : "bg-muted/10 text-muted hover:text-foreground"
                        }`}
                      >
                        📐 Math &amp; Data Breakdown
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedRedditVariant("discussion_question")}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          selectedRedditVariant === "discussion_question"
                            ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                            : "bg-muted/10 text-muted hover:text-foreground"
                        }`}
                      >
                        💬 Community Discussion
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedRedditVariant("show_and_tell")}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          selectedRedditVariant === "show_and_tell"
                            ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                            : "bg-muted/10 text-muted hover:text-foreground"
                        }`}
                      >
                        🛠️ Show &amp; Tell
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-subtle">Target Subreddit:</span>
                      <select
                        value={selectedSubreddit}
                        onChange={(e) => setSelectedSubreddit(e.target.value)}
                        className="h-8 rounded-lg border border-border bg-card px-2.5 text-xs text-foreground font-mono"
                      >
                        {(analysis.recommendedSubreddits || ["SideProject", "SaaS", "tax"]).map((sub) => (
                          <option key={sub} value={sub}>
                            r/{sub}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Reddit Preview Card */}
                  <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-xs">
                    <div className="border-b border-border pb-3 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                          r/{selectedSubreddit} Submission Preview
                        </span>
                        <h3 className="text-base font-bold text-foreground">
                          {activeRedditPost?.title || title}
                        </h3>
                      </div>
                      <Badge variant="outline" className="text-xs font-mono">
                        ~{activeRedditPost?.wordCount || 0} words
                      </Badge>
                    </div>

                    <div className="p-4 rounded-xl bg-background/60 border border-border text-sm font-mono leading-relaxed whitespace-pre-line text-foreground/90 max-h-96 overflow-y-auto">
                      {activeRedditPost?.postText}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopy(activeRedditPost?.postText || "")}
                          className="gap-1.5 rounded-xl"
                        >
                          {copied ? (
                            <>
                              <Check className="h-4 w-4 text-success" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4" />
                              Copy Markdown
                            </>
                          )}
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleQueueArticleForDistribution}
                          className="gap-1.5 rounded-xl"
                        >
                          <Plus className="h-4 w-4 text-primary" />
                          Add to Weekly To-Dos
                        </Button>
                      </div>

                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleOpenRedditSubmit}
                        className="gap-1.5 rounded-xl shadow-xs"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open 1-Click Submit (r/{selectedSubreddit})
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* LINKEDIN TAB CONTENT */}
              {postPlatformTab === "linkedin" && (
                <div className="space-y-6">
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

                    {/* Right Column: LinkedIn Feed Preview */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-subtle">
                          LinkedIn Feed Live Preview
                        </span>
                        <span className="text-[11px] text-subtle flex items-center gap-1">
                          <Globe className="h-3 w-3" /> Public Member Visibility
                        </span>
                      </div>

                      <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
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

                        <div className="text-sm text-foreground whitespace-pre-line leading-relaxed font-sans">
                          {activePostText}
                        </div>

                        {sourceUrl && (
                          <div className="rounded-xl border border-border bg-background/50 p-3 space-y-1">
                            <p className="text-xs font-semibold text-foreground truncate">
                              {title || "Verified Calculation Engine"}
                            </p>
                            <p className="text-[11px] text-subtle truncate">{sourceUrl}</p>
                          </div>
                        )}

                        <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted font-medium">
                          <button type="button" className="flex items-center gap-1.5 hover:text-foreground p-1">
                            <ThumbsUp className="h-4 w-4" />
                            <span>Like</span>
                          </button>
                          <button type="button" className="flex items-center gap-1.5 hover:text-foreground p-1">
                            <MessageSquare className="h-4 w-4" />
                            <span>Comment</span>
                          </button>
                          <button type="button" className="flex items-center gap-1.5 hover:text-foreground p-1">
                            <Repeat className="h-4 w-4" />
                            <span>Repost</span>
                          </button>
                          <button type="button" className="flex items-center gap-1.5 hover:text-foreground p-1">
                            <Send className="h-4 w-4" />
                            <span>Send</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-border/80">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(activePostText)}
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
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* New Manual Task Modal */}
      <Modal
        isOpen={showNewTaskModal}
        onClose={() => setShowNewTaskModal(false)}
        title="Add Distribution To-Do"
        description="Create a manual distribution task for Reddit, LinkedIn, or other channels."
      >
        <form onSubmit={handleCreateManualTask} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-subtle">
                Platform
              </label>
              <select
                value={newTaskPlatform}
                onChange={(e) => {
                  const p = e.target.value as DistributionPlatform;
                  setNewTaskPlatform(p);
                  if (p === "reddit" && !newTaskChannel.startsWith("r/")) {
                    setNewTaskChannel("r/SideProject");
                  }
                }}
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none"
              >
                <option value="reddit">Reddit</option>
                <option value="linkedin">LinkedIn</option>
                <option value="x">X / Twitter</option>
                <option value="producthunt">Product Hunt</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-subtle">
                Target Channel
              </label>
              <Input
                placeholder="e.g. r/tax or Feed"
                value={newTaskChannel}
                onChange={(e) => setNewTaskChannel(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-subtle">
                Source Type
              </label>
              <select
                value={newTaskSourceType}
                onChange={(e) => setNewTaskSourceType(e.target.value as DistributionSourceType)}
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none"
              >
                <option value="software">🛠️ Software Tool</option>
                <option value="article">📝 Marketing Article</option>
                <option value="manual">✏️ Custom / Other</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-subtle">
                Source Name
              </label>
              <Input
                placeholder="e.g. QuarterLine or Article Title"
                value={newTaskSourceTitle}
                onChange={(e) => setNewTaskSourceTitle(e.target.value)}
              />
            </div>
          </div>

          <Input
            label="Post Title / Headline"
            placeholder="e.g. Breakdown: 2026 QBI Statutory Rules"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
          />

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-subtle">
              Post Content (Markdown)
            </label>
            <textarea
              rows={6}
              value={newTaskContent}
              onChange={(e) => setNewTaskContent(e.target.value)}
              placeholder="Paste or write the formatted post copy here..."
              className="w-full rounded-xl border border-border bg-background p-3 text-xs font-mono leading-relaxed text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowNewTaskModal(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={isSavingNewTask}
              className="rounded-xl shadow-xs"
            >
              {isSavingNewTask ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                "Add to Queue"
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Generate Suite Modal */}
      <Modal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        title="Generate Long-Form Article & Post Suite"
        description="Automatically create a comprehensive technical pillar article and companion LinkedIn/Reddit posts."
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-background p-4 text-xs space-y-1 text-muted">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
              Automated Synthesis Engine
            </p>
            <p>
              Generates a full 1,000+ word structured markdown article with citations, plus LinkedIn and Reddit distribution tasks stored directly in Supabase.
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
              <option value="ledgerlink">LedgerLink (Stripe Reconciliation Engine)</option>
              <option value="pressflow">PressFlow (Content Distribution Engine)</option>
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
              Articles and distribution queues are stored in <code className="font-mono text-primary">articles</code> and <code className="font-mono text-primary">distribution_tasks</code>.
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
            <p className="font-semibold text-primary">Zero-API Reddit &amp; LinkedIn Shortcuts:</p>
            <p>
              You can post anytime via <strong>1-Click Submit URLs</strong> with pre-filled markdown—zero developer token approvals needed!
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
