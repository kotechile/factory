import { createAdminClient } from "@/lib/supabase/admin";
import type { Article, LinkedInPost, LinkedInConfig, CreateArticlePayload, CreatePostPayload, PostStatus } from "./types";

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
    return (data || []) as Article[];
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

    if (error) return null;
    return data as Article;
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

  if (payload.id) {
    const { data, error } = await supabase
      .from("articles")
      .update({
        title: payload.title,
        content: payload.content,
        source_url: payload.source_url || null,
        tags: payload.tags || [],
        metadata: payload.metadata || {},
        updated_at: now,
      })
      .eq("id", payload.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update article in Supabase: ${error.message}`);
    }
    return data as Article;
  }

  const { data, error } = await supabase
    .from("articles")
    .insert([
      {
        title: payload.title,
        content: payload.content,
        source_url: payload.source_url || null,
        tags: payload.tags || [],
        metadata: payload.metadata || {},
        created_at: now,
        updated_at: now,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to insert article into Supabase: ${error.message}`);
  }
  return data as Article;
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
