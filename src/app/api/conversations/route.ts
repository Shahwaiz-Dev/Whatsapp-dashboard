import { NextRequest, NextResponse } from "next/server";
import { listConversations } from "@/lib/services/conversations";

export async function GET() {
  const conversations = await listConversations();
  return NextResponse.json(conversations);
}

export async function POST(request: NextRequest) {
  const { contactId, body } = (await request.json()) as {
    contactId?: string;
    body?: string;
  };

  if (!contactId || !body?.trim()) {
    return NextResponse.json(
      { error: "contactId and body are required" },
      { status: 400 }
    );
  }

  const { sendMessageToContact } = await import("@/lib/services/messages");
  const result = await sendMessageToContact(contactId, body.trim());

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
