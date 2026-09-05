import { NextResponse } from "next/server";
import { getLinkedInPosts, saveLinkedInPost } from "@/lib/articles/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get("article_id") || undefined;

    const posts = await getLinkedInPosts(articleId);
    return NextResponse.json({ success: true, posts });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch LinkedIn posts";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.content) {
      return NextResponse.json(
        { success: false, error: "Post content is required." },
        { status: 400 },
      );
    }

    const post = await saveLinkedInPost({
      id: body.id,
      article_id: body.article_id,
      content: body.content,
      format_variant: body.format_variant,
      status: body.status || "draft",
      scheduled_at: body.scheduled_at,
    });

    return NextResponse.json({ success: true, post });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save LinkedIn post";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
