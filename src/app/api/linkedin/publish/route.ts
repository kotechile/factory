import { NextResponse } from "next/server";
import { getLinkedInConfig, saveLinkedInPost, updatePostStatus } from "@/lib/articles/db";
import { publishToLinkedInApi } from "@/lib/articles/linkedin";
import { track } from "@/lib/telemetry";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { content, article_id, format_variant, source_url, link_title, author_urn, access_token } = body;

    if (!content) {
      return NextResponse.json({ success: false, error: "Post content is required" }, { status: 400 });
    }

    // First, save or record the post in Supabase as 'publishing'
    const post = await saveLinkedInPost({
      id: body.post_id,
      article_id,
      content,
      format_variant: format_variant || "bullet_takeaways",
      status: "publishing",
    });

    // Retrieve LinkedIn credentials from body or Supabase config table
    let token = access_token;
    let author = author_urn;

    if (!token || !author) {
      const config = await getLinkedInConfig();
      token = token || config?.access_token;
      author = author || config?.author_urn;
    }

    if (!token || !author) {
      await updatePostStatus(post.id, "failed", {
        error_message: "LinkedIn Access Token or Author URN not configured in Settings.",
      });
      return NextResponse.json({
        success: false,
        error: "LinkedIn credentials missing. Please add your Access Token and Author URN in Settings.",
        post_id: post.id,
      }, { status: 400 });
    }

    // Call LinkedIn API
    const result = await publishToLinkedInApi({
      text: content,
      accessToken: token,
      authorUrn: author,
      linkUrl: source_url,
      linkTitle: link_title,
    });

    if (result.success && result.postUrn) {
      await updatePostStatus(post.id, "published", {
        linkedin_post_urn: result.postUrn,
        published_at: result.publishedAt || new Date().toISOString(),
      });

      // Track telemetry
      await track("linkedin_post_published", {
        post_id: post.id,
        article_id,
        format_variant,
        char_count: content.length,
      }, "pressflow");

      return NextResponse.json({
        success: true,
        post_id: post.id,
        linkedin_post_urn: result.postUrn,
        published_at: result.publishedAt,
      });
    } else {
      await updatePostStatus(post.id, "failed", {
        error_message: result.error || "LinkedIn API returned an error",
      });

      return NextResponse.json({
        success: false,
        error: result.error || "Failed to publish post to LinkedIn",
        post_id: post.id,
      }, { status: 502 });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error during LinkedIn publish";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
