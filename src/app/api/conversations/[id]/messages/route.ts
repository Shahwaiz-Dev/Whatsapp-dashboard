import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Conversation } from "@/lib/models";
import {
  getConversationMessages,
  markConversationRead,
} from "@/lib/services/conversations";
import { serializeDoc } from "@/lib/serialize";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();

  const { id } = await params;

  const conversation = await Conversation.findById(id)
    .populate("contactId")
    .lean();

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 }
    );
  }

  const populated = conversation.contactId as unknown as {
    _id: { toString(): string };
    name: string | null;
    phone: string;
    email?: string | null;
  } | null;

  const messages = await getConversationMessages(id);
  await markConversationRead(id);

  return NextResponse.json({
    conversation: {
      id: conversation._id.toString(),
      contactId: populated?._id.toString() ?? "",
      lastMessageAt: conversation.lastMessageAt,
      unreadCount: conversation.unreadCount,
      contact: populated
        ? {
            id: populated._id.toString(),
            name: populated.name,
            phone: populated.phone,
            email: populated.email ?? null,
          }
        : null,
    },
    messages: messages.map((message) => serializeDoc(message as Record<string, unknown>)),
  });
}
