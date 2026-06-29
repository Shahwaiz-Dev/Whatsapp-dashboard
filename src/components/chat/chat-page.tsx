"use client";

import { ConversationList } from "@/components/chat/conversation-list";
import { MessageThread } from "@/components/chat/message-thread";
import { useLocale } from "@/components/providers/locale-provider";

export function ChatPageContent({ contactId }: { contactId?: string }) {
  const { t } = useLocale();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("chat.title")}
        </h1>
        <p className="text-muted-foreground">{t("chat.subtitle")}</p>
      </div>
      <div className="flex h-[calc(100vh-12rem)] overflow-hidden rounded-xl border bg-background">
        <div
          className={`w-full max-w-sm border-r ${contactId ? "hidden md:block" : ""}`}
        >
          <ConversationList />
        </div>
        <div
          className={`flex-1 ${contactId ? "" : "hidden items-center justify-center text-muted-foreground md:flex"}`}
        >
          {contactId ? (
            <MessageThread contactId={contactId} />
          ) : (
            t("chat.selectConversation")
          )}
        </div>
      </div>
    </div>
  );
}
