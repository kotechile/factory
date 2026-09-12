import { createAdminClient } from "@/lib/supabase/admin";
import type {
  Article,
  LinkedInPost,
  LinkedInConfig,
  CreateArticlePayload,
  CreatePostPayload,
  PostStatus,
  DistributionTask,
  DistributionTaskStatus,
  CreateDistributionTaskPayload,
} from "./types";

function normalizeArticleRow(row: Record<string, unknown>): Article {
  const title = (row.title as string) || (row.headline as string) || "Untitled Article";
  const content = (row.content as string) || (row.body_md as string) || "";
  const sourceUrl = (row.source_url as string) || (Array.isArray(row.sources) && row.sources[0]?.url ? row.sources[0].url : null);
  const tags = Array.isArray(row.tags) && row.tags.length > 0 
    ? (row.tags as string[]) 
    : (row.vertical ? [row.vertical as string] : []);

  return {
    id: String(row.id || ""),
    title,
    headline: row.headline ? String(row.headline) : undefined,
    content,
    body_md: row.body_md ? String(row.body_md) : undefined,
    slug: row.slug ? String(row.slug) : undefined,
    vertical: row.vertical ? String(row.vertical) : undefined,
    source_url: sourceUrl,
    sources: (row.sources as Array<{ url?: string; title?: string }>) || null,
    tags,
    status: row.status ? String(row.status) : "draft",
    metadata: (row.metadata as Record<string, unknown>) || {},
    created_at: String(row.created_at || new Date().toISOString()),
    updated_at: String(row.updated_at || row.created_at || new Date().toISOString()),
  };
}

/**
 * Retrieves all articles from Supabase ordered by creation date.
 */
export async function getArticles(): Promise<Article[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Supabase getArticles query error:", error.message);
      return [];
    }
    return (data || []).map((row) => normalizeArticleRow(row as Record<string, unknown>));
  } catch (err) {
    console.error("Failed to connect to Supabase for getArticles:", err);
    return [];
  }
}

/**
 * Retrieves a single article by ID.
 */
export async function getArticleById(id: string): Promise<Article | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return null;
    return normalizeArticleRow(data as Record<string, unknown>);
  } catch {
    return null;
  }
}

/**
 * Inserts or updates an article in Supabase.
 */
export async function saveArticle(payload: CreateArticlePayload & { id?: string }): Promise<Article> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const title = payload.title || payload.headline || "Untitled Article";
  const content = payload.content || payload.body_md || "";
  const tags = payload.tags || (payload.vertical ? [payload.vertical] : []);

  if (payload.id) {
    const updatePayload: Record<string, unknown> = {
      title,
      content,
      source_url: payload.source_url || null,
      tags,
      metadata: payload.metadata || {},
      updated_at: now,
    };
    if (payload.headline) updatePayload.headline = payload.headline;
    if (payload.body_md) updatePayload.body_md = payload.body_md;
    if (payload.slug) updatePayload.slug = payload.slug;
    if (payload.vertical) updatePayload.vertical = payload.vertical;
    if (payload.status) updatePayload.status = payload.status;
    if (payload.sources) updatePayload.sources = payload.sources;

    const { data, error } = await supabase
      .from("articles")
      .update(updatePayload)
      .eq("id", payload.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update article in Supabase: ${error.message}`);
    }
    return normalizeArticleRow(data as Record<string, unknown>);
  }

  const insertPayload: Record<string, unknown> = {
    title,
    content,
    source_url: payload.source_url || null,
    tags,
    metadata: payload.metadata || {},
    created_at: now,
    updated_at: now,
  };
  if (payload.headline) insertPayload.headline = payload.headline;
  if (payload.body_md) insertPayload.body_md = payload.body_md;
  if (payload.slug) insertPayload.slug = payload.slug;
  if (payload.vertical) insertPayload.vertical = payload.vertical;
  if (payload.status) insertPayload.status = payload.status;
  if (payload.sources) insertPayload.sources = payload.sources;

  const { data, error } = await supabase
    .from("articles")
    .insert([insertPayload])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to insert article into Supabase: ${error.message}`);
  }
  return normalizeArticleRow(data as Record<string, unknown>);
}

/**
 * Deletes an article by ID.
 */
export async function deleteArticle(id: string): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("articles").delete().eq("id", id);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Retrieves all LinkedIn posts with optional status/article filter.
 */
export async function getLinkedInPosts(articleId?: string): Promise<LinkedInPost[]> {
  try {
    const supabase = createAdminClient();
    let query = supabase.from("linkedin_posts").select("*").order("created_at", { ascending: false });

    if (articleId) {
      query = query.eq("article_id", articleId);
    }

    const { data, error } = await query;
    if (error) {
      console.warn("Supabase getLinkedInPosts error:", error.message);
      return [];
    }
    return (data || []) as LinkedInPost[];
  } catch (err) {
    console.error("Failed to connect to Supabase for getLinkedInPosts:", err);
    return [];
  }
}

/**
 * Saves a new or existing LinkedIn post draft.
 */
export async function saveLinkedInPost(payload: CreatePostPayload & { id?: string }): Promise<LinkedInPost> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  if (payload.id) {
    const { data, error } = await supabase
      .from("linkedin_posts")
      .update({
        content: payload.content,
        format_variant: payload.format_variant || "bullet_takeaways",
        status: payload.status || "draft",
        scheduled_at: payload.scheduled_at || null,
        updated_at: now,
      })
      .eq("id", payload.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update post in Supabase: ${error.message}`);
    }
    return data as LinkedInPost;
  }

  const { data, error } = await supabase
    .from("linkedin_posts")
    .insert([
      {
        article_id: payload.article_id || null,
        platform: "linkedin",
        content: payload.content,
        format_variant: payload.format_variant || "bullet_takeaways",
        status: payload.status || "draft",
        scheduled_at: payload.scheduled_at || null,
        created_at: now,
        updated_at: now,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to insert post into Supabase: ${error.message}`);
  }
  return data as LinkedInPost;
}

/**
 * Updates LinkedIn post status, urn, or error.
 */
export async function updatePostStatus(
  id: string,
  status: PostStatus,
  extra?: { linkedin_post_urn?: string; error_message?: string; published_at?: string },
): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from("linkedin_posts")
    .update({
      status,
      linkedin_post_urn: extra?.linkedin_post_urn,
      error_message: extra?.error_message,
      published_at: extra?.published_at,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
}

/**
 * Retrieves LinkedIn configuration / access token from Supabase.
 */
export async function getLinkedInConfig(): Promise<LinkedInConfig | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("linkedin_integrations")
      .select("*")
      .eq("id", "default")
      .single();

    if (error) return null;
    return data as LinkedInConfig;
  } catch {
    return null;
  }
}

/**
 * Saves or updates LinkedIn integration credentials in Supabase.
 */
export async function saveLinkedInConfig(config: { author_urn?: string; access_token?: string }): Promise<LinkedInConfig> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("linkedin_integrations")
    .upsert({
      id: "default",
      author_urn: config.author_urn || null,
      access_token: config.access_token || null,
      is_active: true,
      updated_at: now,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save LinkedIn config to Supabase: ${error.message}`);
  }
  return data as LinkedInConfig;
}

// Fallback in-memory store for resilience if table is pending in remote DB
const memoryDistributionTasks = new Map<string, DistributionTask>();

/**
 * Normalizes a raw Supabase database row into a DistributionTask.
 */
function normalizeTaskRow(row: Record<string, unknown>): DistributionTask {
  return {
    id: String(row.id || ""),
    source_type: (row.source_type as "software" | "article" | "manual") || "article",
    source_id: row.source_id ? String(row.source_id) : null,
    source_title: (row.source_title as string) || "Untitled Source",
    platform: (row.platform as "reddit" | "linkedin" | "x" | "producthunt") || "reddit",
    channel: (row.channel as string) || "Feed",
    post_title: (row.post_title as string) || "",
    post_content: (row.post_content as string) || "",
    submit_url: row.submit_url ? String(row.submit_url) : null,
    status: (row.status as DistributionTaskStatus) || "ready_to_publish",
    metadata: (row.metadata as Record<string, unknown>) || {},
    created_at: String(row.created_at || new Date().toISOString()),
    updated_at: String(row.updated_at || row.created_at || new Date().toISOString()),
    completed_at: row.completed_at ? String(row.completed_at) : null,
  };
}

/**
 * Retrieves all distribution tasks with optional filtering by status and source_type.
 */
export async function getDistributionTasks(filters?: {
  status?: DistributionTaskStatus;
  sourceType?: string;
}): Promise<DistributionTask[]> {
  try {
    const supabase = createAdminClient();
    let query = supabase
      .from("distribution_tasks")
      .select("*")
      .order("created_at", { ascending: false });

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }
    if (filters?.sourceType) {
      query = query.eq("source_type", filters.sourceType);
    }

    const { data, error } = await query;
    if (error) {
      console.warn("Supabase getDistributionTasks fallback to memory:", error.message);
      let list = Array.from(memoryDistributionTasks.values());
      if (filters?.status) {
        list = list.filter((t) => t.status === filters.status);
      }
      if (filters?.sourceType) {
        list = list.filter((t) => t.source_type === filters.sourceType);
      }
      return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return (data || []).map((row) => normalizeTaskRow(row as Record<string, unknown>));
  } catch (err) {
    console.error("Failed to query distribution tasks:", err);
    return Array.from(memoryDistributionTasks.values());
  }
}

/**
 * Saves a single distribution task (insert or update).
 */
export async function saveDistributionTask(payload: CreateDistributionTaskPayload): Promise<DistributionTask> {
  const now = new Date().toISOString();
  const taskId = payload.id || `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const taskData: DistributionTask = {
    id: taskId,
    source_type: payload.source_type || "article",
    source_id: payload.source_id || null,
    source_title: payload.source_title || "Untitled",
    platform: payload.platform || "reddit",
    channel: payload.channel || "Feed",
    post_title: payload.post_title || "",
    post_content: payload.post_content || "",
    submit_url: payload.submit_url || null,
    status: payload.status || "ready_to_publish",
    metadata: payload.metadata || {},
    created_at: now,
    updated_at: now,
    completed_at: payload.status === "done" ? now : null,
  };

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("distribution_tasks")
      .upsert(
        {
          id: taskData.id,
          source_type: taskData.source_type,
          source_id: taskData.source_id,
          source_title: taskData.source_title,
          platform: taskData.platform,
          channel: taskData.channel,
          post_title: taskData.post_title,
          post_content: taskData.post_content,
          submit_url: taskData.submit_url,
          status: taskData.status,
          metadata: taskData.metadata,
          updated_at: now,
          completed_at: taskData.completed_at,
        },
        { onConflict: "id" },
      )
      .select()
      .single();

    if (error) {
      console.warn("Supabase saveDistributionTask fallback to memory:", error.message);
      memoryDistributionTasks.set(taskData.id, taskData);
      return taskData;
    }

    return normalizeTaskRow(data as Record<string, unknown>);
  } catch {
    memoryDistributionTasks.set(taskData.id, taskData);
    return taskData;
  }
}

/**
 * Updates the status of a distribution task (e.g. 'ready_to_publish', 'done', 'deleted').
 */
export async function updateDistributionTaskStatus(
  id: string,
  status: DistributionTaskStatus,
): Promise<boolean> {
  const now = new Date().toISOString();
  const completedAt = status === "done" ? now : null;

  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("distribution_tasks")
      .update({
        status,
        updated_at: now,
        completed_at: completedAt,
      })
      .eq("id", id);

    if (error) {
      console.warn("Supabase updateDistributionTaskStatus fallback to memory:", error.message);
    }
  } catch (err) {
    console.warn("Error updating task in Supabase:", err);
  }

  // Update memory cache
  const existing = memoryDistributionTasks.get(id);
  if (existing) {
    existing.status = status;
    existing.updated_at = now;
    existing.completed_at = completedAt;
    memoryDistributionTasks.set(id, existing);
  }

  return true;
}

/**
 * Permanently deletes a task or marks it as deleted.
 */
export async function deleteDistributionTask(id: string, permanent = false): Promise<boolean> {
  if (!permanent) {
    return updateDistributionTaskStatus(id, "deleted");
  }

  try {
    const supabase = createAdminClient();
    await supabase.from("distribution_tasks").delete().eq("id", id);
  } catch {
    // ignore
  }

  memoryDistributionTasks.delete(id);
  return true;
}

/**
 * Batch saves multiple distribution tasks into the store.
 */
export async function batchSaveDistributionTasks(tasks: DistributionTask[]): Promise<DistributionTask[]> {
  const results: DistributionTask[] = [];
  for (const task of tasks) {
    const saved = await saveDistributionTask(task);
    results.push(saved);
  }
  return results;
}
