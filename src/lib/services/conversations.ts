import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import {
  Contact,
  Conversation,
  Group,
  Message,
} from "@/lib/models";
import { isWithinSessionWindow } from "@/lib/whatsapp";

export async function getOrCreateConversation(contactId: string) {
  await connectDB();

  const existing = await Conversation.findOne({ contactId }).lean();
  if (existing) return existing;

  return Conversation.create({ contactId });
}

export async function getLastInboundMessageAt(contactId: string) {
  await connectDB();

  const message = await Message.findOne({
    contactId,
    direction: "inbound",
  })
    .sort({ sentAt: -1 })
    .select({ sentAt: 1 })
    .lean();

  return message?.sentAt ?? null;
}

export async function canSendSessionMessage(contactId: string) {
  const lastInbound = await getLastInboundMessageAt(contactId);
  return isWithinSessionWindow(lastInbound);
}

/** Batch version — one aggregation instead of N per contact list page. */
export async function batchCanSendSessionMessage(
  contactIds: string[]
): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>();
  if (contactIds.length === 0) return result;

  await connectDB();

  const inboundMessages = await Message.aggregate<{
    _id: string;
    sentAt: Date;
  }>([
    {
      $match: {
        contactId: {
          $in: contactIds.map((id) => new mongoose.Types.ObjectId(id)),
        },
        direction: "inbound",
      },
    },
    { $sort: { sentAt: -1 } },
    { $group: { _id: "$contactId", sentAt: { $first: "$sentAt" } } },
  ]);

  const lastInboundByContact = new Map(
    inboundMessages.map((m) => [m._id.toString(), m.sentAt])
  );

  for (const id of contactIds) {
    result.set(id, isWithinSessionWindow(lastInboundByContact.get(id) ?? null));
  }

  return result;
}

export async function listConversations() {
  await connectDB();

  const conversations = await Conversation.find()
    .populate("contactId")
    .sort({ lastMessageAt: -1 })
    .lean();

  const conversationIds = conversations.map((c) => c._id);

  const latestMessages = await Message.aggregate<{
    _id: string;
    body: string;
    direction: string;
  }>([
    { $match: { conversationId: { $in: conversationIds } } },
    { $sort: { sentAt: -1 } },
    {
      $group: {
        _id: "$conversationId",
        body: { $first: "$body" },
        direction: { $first: "$direction" },
      },
    },
  ]);

  const messageByConversation = new Map(
    latestMessages.map((m) => [m._id.toString(), m])
  );

  return conversations.map((conversation) => {
    const contact = conversation.contactId as unknown as {
      _id: { toString(): string };
      name: string | null;
      phone: string;
    } | null;
    const latest = messageByConversation.get(conversation._id.toString());

    return {
      id: conversation._id.toString(),
      contactId: contact?._id.toString() ?? "",
      lastMessageAt: conversation.lastMessageAt,
      unreadCount: conversation.unreadCount,
      contact: contact
        ? {
            id: contact._id.toString(),
            name: contact.name,
            phone: contact.phone,
          }
        : null,
      messages: latest
        ? [{ body: latest.body, direction: latest.direction }]
        : [],
    };
  });
}

export async function getConversationMessages(
  conversationId: string,
  limit = 50
) {
  await connectDB();

  return Message.find({ conversationId })
    .sort({ sentAt: 1 })
    .limit(limit)
    .lean();
}

export async function markConversationRead(conversationId: string) {
  await connectDB();

  await Conversation.updateOne({ _id: conversationId }, { unreadCount: 0 });
}

export async function getDashboardStats() {
  await connectDB();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [contactCount, groupCount, messagesSentToday, unreadChats] =
    await Promise.all([
      Contact.countDocuments(),
      Group.countDocuments(),
      Message.countDocuments({
        direction: "outbound",
        sentAt: { $gte: today },
      }),
      Conversation.countDocuments({ unreadCount: { $gt: 0 } }),
    ]);

  return { contactCount, groupCount, messagesSentToday, unreadChats };
}
