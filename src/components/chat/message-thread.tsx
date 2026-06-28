"use client";

import { useEffect, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageBubble } from "@/components/chat/message-bubble";
import { formatPhoneDisplay } from "@/lib/phone";
import type { ContactRow } from "@/components/contacts/contacts-table";

interface Message {
  id: string;
  body: string;
  direction: string;
  status: string;
  sentAt: string;
}

interface ConversationData {
  conversation: {
    id: string;
    contact: { id: string; name: string | null; phone: string };
  };
  messages: Message[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function getInitials(name: string | null, phone: string) {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  return phone.slice(-2);
}

export function MessageThread({ contactId }: { contactId: string }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { mutate: globalMutate } = useSWRConfig();

  const { data: conversations } = useSWR<
    { id: string; contactId: string }[]
  >("/api/conversations", fetcher);

  const { data: contactData } = useSWR<{ contacts: ContactRow[] }>(
    `/api/contacts?ids=${contactId}`,
    fetcher
  );

  const conversationId = conversations?.find(
    (c) => c.contactId === contactId
  )?.id;

  const contact = contactData?.contacts[0];

  const { data, isLoading, mutate } = useSWR<ConversationData>(
    conversationId
      ? `/api/conversations/${conversationId}/messages`
      : null,
    fetcher,
    { refreshInterval: 5000 }
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages]);

  async function handleSend() {
    if (!message.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, body: message.trim() }),
      });
      const result = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(result.error ?? "Send failed");
      setMessage("");
      await mutate();
      await globalMutate("/api/conversations");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  if (!contact && !isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Contact not found
      </div>
    );
  }

  if (isLoading && !contact) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b p-4">
          <Skeleton className="h-8 w-40" />
        </div>
      </div>
    );
  }

  const displayContact = data?.conversation.contact ?? contact!;
  const displayName =
    displayContact.name ?? formatPhoneDisplay(displayContact.phone);
  const messages = data?.messages ?? [];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b bg-background px-4 py-3">
        <Avatar>
          <AvatarFallback className="bg-emerald-100 text-emerald-800">
            {getInitials(displayContact.name, displayContact.phone)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{displayName}</p>
          <p className="text-xs text-muted-foreground">
            {formatPhoneDisplay(displayContact.phone)}
          </p>
        </div>
      </div>

      <ScrollArea className="flex-1 bg-[#e5ddd5]/30 p-4">
        <div className="space-y-3">
          {messages.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              No messages yet. Send the first message below.
            </p>
          ) : (
            messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                body={msg.body}
                direction={msg.direction as "inbound" | "outbound"}
                status={msg.status}
                sentAt={msg.sentAt}
              />
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="border-t bg-background p-3">
        <div className="flex gap-2">
          <Textarea
            placeholder="Type a message..."
            rows={2}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="min-h-[44px] resize-none"
          />
          <Button
            size="icon"
            className="shrink-0 bg-emerald-600 hover:bg-emerald-700"
            onClick={handleSend}
            disabled={sending || !message.trim()}
          >
            {sending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
