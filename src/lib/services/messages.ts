import { connectDB } from "@/lib/mongodb";
import { Contact, Conversation, Group, Message } from "@/lib/models";
import { sendTextMessage } from "@/lib/whatsapp";
import {
  canSendSessionMessage,
  getOrCreateConversation,
} from "@/lib/services/conversations";

export interface SendMessageInput {
  contactIds: string[];
  body: string;
}

export interface SendResult {
  contactId: string;
  contactName: string | null;
  phone: string;
  success: boolean;
  error?: string;
  messageId?: string;
}

export async function resolveContactIds(
  contactIds: string[],
  groupIds: string[]
): Promise<string[]> {
  await connectDB();

  const ids = new Set(contactIds);

  if (groupIds.length > 0) {
    const groups = await Group.find({
      _id: { $in: groupIds },
    })
      .select({ memberIds: 1 })
      .lean();

    for (const group of groups) {
      for (const memberId of group.memberIds) {
        ids.add(memberId.toString());
      }
    }
  }

  return Array.from(ids);
}

export async function sendMessagesToContacts(
  input: SendMessageInput
): Promise<SendResult[]> {
  await connectDB();

  const { contactIds, body } = input;
  const results: SendResult[] = [];

  for (const contactId of contactIds) {
    const contact = await Contact.findById(contactId).lean();
    if (!contact) {
      results.push({
        contactId,
        contactName: null,
        phone: "",
        success: false,
        error: "Contact not found",
      });
      continue;
    }

    const canReply = await canSendSessionMessage(contactId);
    if (!canReply) {
      results.push({
        contactId,
        contactName: contact.name ?? null,
        phone: contact.phone,
        success: false,
        error: "Outside 24h window — template message required",
      });
      continue;
    }

    const conversation = await getOrCreateConversation(contactId);
    const sendResult = await sendTextMessage(contact.phone, body);

    const message = await Message.create({
      conversationId: conversation._id,
      contactId: contact._id,
      direction: "outbound",
      body,
      waMessageId: sendResult.waMessageId ?? null,
      status: sendResult.success ? "sent" : "failed",
    });

    if (sendResult.success) {
      await Conversation.updateOne(
        { _id: conversation._id },
        { lastMessageAt: new Date() }
      );
    }

    results.push({
      contactId,
      contactName: contact.name ?? null,
      phone: contact.phone,
      success: sendResult.success,
      error: sendResult.error,
      messageId: message._id.toString(),
    });

    await new Promise((r) => setTimeout(r, 200));
  }

  return results;
}

export async function sendMessageToContact(contactId: string, body: string) {
  const [result] = await sendMessagesToContacts({ contactIds: [contactId], body });
  return result;
}

export async function handleInboundMessage(
  from: string,
  text: string,
  waMessageId: string,
  timestamp: number
) {
  await connectDB();

  const phone = from.replace(/\D/g, "");
  let contact = await Contact.findOne({ phone }).lean();

  if (!contact) {
    contact = (
      await Contact.create({ phone, name: `+${phone}` })
    ).toObject();
  }

  const conversation = await getOrCreateConversation(contact._id.toString());
  const sentAt = new Date(timestamp * 1000);

  await Message.create({
    conversationId: conversation._id,
    contactId: contact._id,
    direction: "inbound",
    body: text,
    waMessageId,
    status: "delivered",
    sentAt,
  });

  await Conversation.updateOne(
    { _id: conversation._id },
    {
      $set: { lastMessageAt: sentAt },
      $inc: { unreadCount: 1 },
    }
  );
}

export async function handleMessageStatus(
  waMessageId: string,
  status: string
) {
  await connectDB();

  const message = await Message.findOne({ waMessageId }).lean();
  if (!message) return;

  const statusMap: Record<string, string> = {
    sent: "sent",
    delivered: "delivered",
    read: "read",
    failed: "failed",
  };

  await Message.updateOne(
    { _id: message._id },
    { status: statusMap[status] ?? status }
  );
}
