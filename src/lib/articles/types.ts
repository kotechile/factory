export type PostStatus = "draft" | "queued" | "publishing" | "published" | "failed";

export interface Article {
  id: string;
  title: string;
  headline?: string;
  content: string;
  body_md?: string;
  slug?: string;
  vertical?: string;
  source_url?: string | null;
  sources?: Array<{ url?: string; title?: string }> | null;
  tags: string[];
  status?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface LinkedInPost {
  id: string;
  article_id?: string | null;
  platform: string;
  content: string;
  format_variant: string;
  status: PostStatus;
  scheduled_at?: string | null;
  published_at?: string | null;
  linkedin_post_urn?: string | null;
  error_message?: string | null;
  metrics?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface LinkedInConfig {
  id: string;
  author_urn?: string | null;
  access_token?: string | null;
  token_expires_at?: string | null;
  is_active: boolean;
  updated_at?: string;
}

export interface CreateArticlePayload {
  title?: string;
  headline?: string;
  content?: string;
  body_md?: string;
  slug?: string;
  vertical?: string;
  source_url?: string;
  sources?: Array<{ url?: string; title?: string }>;
  tags?: string[];
  status?: string;
  metadata?: Record<string, unknown>;
}

export interface CreatePostPayload {
  article_id?: string;
  content: string;
  format_variant?: string;
  status?: PostStatus;
  scheduled_at?: string;
}
