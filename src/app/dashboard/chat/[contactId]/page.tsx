import { MessageThread } from "@/components/chat/message-thread";
import { ConversationList } from "@/components/chat/conversation-list";

export default async function ChatContactPage({
  params,
}: {
  params: Promise<{ contactId: string }>;
}) {
  const { contactId } = await params;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Chat</h1>
        <p className="text-muted-foreground">
          View and reply to WhatsApp conversations
        </p>
      </div>
      <div className="flex h-[calc(100vh-12rem)] overflow-hidden rounded-xl border bg-background">
        <div className="hidden w-full max-w-sm border-r md:block">
          <ConversationList />
        </div>
        <div className="flex-1">
          <MessageThread contactId={contactId} />
        </div>
      </div>
    </div>
  );
}
