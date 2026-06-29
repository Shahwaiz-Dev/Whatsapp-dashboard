"use client";

import useSWR from "swr";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatPhoneDisplay } from "@/lib/phone";
import { useLocale } from "@/components/providers/locale-provider";

interface Conversation {
  id: string;
  contactId: string;
  lastMessageAt: string | null;
  unreadCount: number;
  contact: { id: string; name: string | null; phone: string };
  messages: { body: string; direction: string }[];
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

export function ConversationList() {
  const pathname = usePathname();
  const { t, dateLocale } = useLocale();
  const { data, isLoading } = useSWR<Conversation[]>(
    "/api/conversations",
    fetcher,
    { refreshInterval: 5000 }
  );

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
        {t("chat.noConversations")}
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="divide-y">
        {data.map((conv) => {
          const href = `/dashboard/chat/${conv.contactId}`;
          const isActive = pathname === href;
          const lastMsg = conv.messages[0];
          const displayName =
            conv.contact.name ?? formatPhoneDisplay(conv.contact.phone);

          return (
            <Link
              key={conv.id}
              href={href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50",
                isActive && "bg-muted"
              )}
            >
              <Avatar className="size-11">
                <AvatarFallback className="bg-red-100 text-red-800">
                  {getInitials(conv.contact.name, conv.contact.phone)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-medium">{displayName}</p>
                  {conv.lastMessageAt && (
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(conv.lastMessageAt), {
                        addSuffix: false,
                        locale: dateLocale,
                      })}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm text-muted-foreground">
                    {lastMsg
                      ? `${lastMsg.direction === "outbound" ? t("common.you") : ""}${lastMsg.body}`
                      : t("chat.noMessages")}
                  </p>
                  {conv.unreadCount > 0 && (
                    <Badge className="size-5 shrink-0 justify-center rounded-full bg-red-600 p-0 text-[10px]">
                      {conv.unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </ScrollArea>
  );
}
