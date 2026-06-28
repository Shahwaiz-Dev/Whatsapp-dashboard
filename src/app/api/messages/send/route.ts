import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  resolveContactIds,
  sendMessagesToContacts,
} from "@/lib/services/messages";

const sendSchema = z.object({
  body: z.string().min(1).max(4096),
  contactIds: z.array(z.string()).default([]),
  groupIds: z.array(z.string()).default([]),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = sendSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { body: messageBody, contactIds, groupIds } = parsed.data;
  const resolvedIds = await resolveContactIds(contactIds, groupIds);

  if (resolvedIds.length === 0) {
    return NextResponse.json(
      { error: "No recipients selected" },
      { status: 400 }
    );
  }

  const results = await sendMessagesToContacts({
    contactIds: resolvedIds,
    body: messageBody,
  });

  const successCount = results.filter((r) => r.success).length;

  return NextResponse.json({
    total: results.length,
    successCount,
    failedCount: results.length - successCount,
    results,
  });
}
