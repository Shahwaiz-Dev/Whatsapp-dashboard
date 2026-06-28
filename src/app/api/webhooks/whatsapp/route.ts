import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/whatsapp";
import {
  handleInboundMessage,
  handleMessageStatus,
} from "@/lib/services/messages";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token === process.env.WHATSAPP_VERIFY_TOKEN &&
    challenge
  ) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (process.env.WHATSAPP_APP_SECRET) {
    if (!verifyWebhookSignature(rawBody, signature)) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const body = JSON.parse(rawBody) as {
    entry?: {
      changes?: {
        value?: {
          messages?: {
            from: string;
            id: string;
            timestamp: string;
            type: string;
            text?: { body: string };
          }[];
          statuses?: {
            id: string;
            status: string;
            recipient_id: string;
          }[];
        };
      }[];
    }[];
  };

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;

      if (value?.messages) {
        for (const message of value.messages) {
          if (message.type === "text" && message.text?.body) {
            await handleInboundMessage(
              message.from,
              message.text.body,
              message.id,
              parseInt(message.timestamp, 10)
            );
          }
        }
      }

      if (value?.statuses) {
        for (const status of value.statuses) {
          await handleMessageStatus(status.id, status.status);
        }
      }
    }
  }

  return NextResponse.json({ status: "ok" });
}
