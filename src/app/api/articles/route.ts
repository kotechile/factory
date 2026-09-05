import { NextResponse } from "next/server";
import { getArticles, saveArticle, deleteArticle } from "@/lib/articles/db";

export async function GET() {
  try {
    const articles = await getArticles();
    return NextResponse.json({ success: true, articles });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch articles";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.title || !body.content) {
      return NextResponse.json(
        { success: false, error: "Title and content are required." },
        { status: 400 },
      );
    }

    const article = await saveArticle({
      id: body.id,
      title: body.title,
      content: body.content,
      source_url: body.source_url,
      tags: body.tags || [],
      metadata: body.metadata,
    });

    return NextResponse.json({ success: true, article });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save article";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "Article ID is required" }, { status: 400 });
    }

    const ok = await deleteArticle(id);
    return NextResponse.json({ success: ok });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete article";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
