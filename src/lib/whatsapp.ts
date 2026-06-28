import crypto from "node:crypto";

const GRAPH_API_VERSION = process.env.WHATSAPP_GRAPH_API_VERSION ?? "v21.0";

function getWhatsAppConfig() {
  const accessToken =
    process.env.WHATSAPP_ACCESS_TOKEN ?? process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    throw new Error("WhatsApp API credentials are not configured");
  }

  return { accessToken, phoneNumberId };
}

export interface SendTextMessageResult {
  success: boolean;
  waMessageId?: string;
  error?: string;
}

export async function sendTextMessage(
  to: string,
  body: string
): Promise<SendTextMessageResult> {
  const { accessToken, phoneNumberId } = getWhatsAppConfig();

  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { preview_url: false, body },
      }),
    }
  );

  const data = (await response.json()) as {
    messages?: { id: string }[];
    error?: { message: string };
  };

  if (!response.ok) {
    return {
      success: false,
      error: data.error?.message ?? `HTTP ${response.status}`,
    };
  }

  return {
    success: true,
    waMessageId: data.messages?.[0]?.id,
  };
}

export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null
): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret || !signature?.startsWith("sha256=")) return false;

  const expected = crypto
    .createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex");
  const provided = signature.slice("sha256=".length);

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(provided)
    );
  } catch {
    return false;
  }
}

export const SESSION_WINDOW_MS = 24 * 60 * 60 * 1000;

export function isWithinSessionWindow(lastInboundAt: Date | null): boolean {
  if (!lastInboundAt) return false;
  return Date.now() - lastInboundAt.getTime() < SESSION_WINDOW_MS;
}
