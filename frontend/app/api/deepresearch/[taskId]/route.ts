/**
 * Deep Research Task Status API
 *
 * Note: This endpoint is deprecated. The new streaming implementation
 * at /api/deepresearch/stream doesn't require polling.
 *
 * Kept for backwards compatibility only.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;

  // Since we now use streaming, this endpoint just returns that the task is not found
  // The new implementation doesn't create persistent tasks
  return NextResponse.json({
    taskId,
    status: "not_found",
    message: "This endpoint is deprecated. Use /api/deepresearch/stream for new requests.",
  });
}
