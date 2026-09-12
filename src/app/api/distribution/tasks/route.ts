import { NextResponse } from "next/server";
import {
  getDistributionTasks,
  saveDistributionTask,
  updateDistributionTaskStatus,
  deleteDistributionTask,
  batchSaveDistributionTasks,
  getArticles,
} from "@/lib/articles/db";
import { generateWeeklyBatch } from "@/lib/calc/content-distributor/engine";
import type { DistributionTaskStatus } from "@/lib/articles/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status") as DistributionTaskStatus | "all" | null;
    const sourceType = searchParams.get("sourceType") || undefined;

    const filterStatus = statusParam && statusParam !== "all" ? statusParam : undefined;

    const tasks = await getDistributionTasks({
      status: filterStatus,
      sourceType,
    });

    return NextResponse.json({ success: true, tasks });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch distribution tasks";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Check if triggering weekly batch generation
    if (body.action === "generate_weekly_batch") {
      const articles = await getArticles();
      const generated = generateWeeklyBatch(articles);
      const savedTasks = await batchSaveDistributionTasks(generated);

      return NextResponse.json({
        success: true,
        message: `Generated ${savedTasks.length} distribution tasks.`,
        tasks: savedTasks,
      });
    }

    if (!body.post_title || !body.post_content || !body.channel) {
      return NextResponse.json(
        { success: false, error: "Post title, content, and channel are required." },
        { status: 400 },
      );
    }

    const task = await saveDistributionTask({
      id: body.id,
      source_type: body.source_type || "manual",
      source_id: body.source_id,
      source_title: body.source_title || "Manual Task",
      platform: body.platform || "reddit",
      channel: body.channel,
      post_title: body.post_title,
      post_content: body.post_content,
      submit_url: body.submit_url,
      status: body.status || "ready_to_publish",
      metadata: body.metadata,
    });

    return NextResponse.json({ success: true, task });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create distribution task";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    if (!body.id || !body.status) {
      return NextResponse.json(
        { success: false, error: "Task ID and status are required." },
        { status: 400 },
      );
    }

    const validStatuses: DistributionTaskStatus[] = ["ready_to_publish", "done", "deleted"];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status: ${body.status}` },
        { status: 400 },
      );
    }

    const ok = await updateDistributionTaskStatus(body.id, body.status);
    return NextResponse.json({ success: ok });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update task status";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const permanent = searchParams.get("permanent") === "true";

    if (!id) {
      return NextResponse.json({ success: false, error: "Task ID is required" }, { status: 400 });
    }

    const ok = await deleteDistributionTask(id, permanent);
    return NextResponse.json({ success: ok });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete task";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
