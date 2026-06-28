import { ConversationList } from "@/components/chat/conversation-list";

export default function ChatPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Chat</h1>
        <p className="text-muted-foreground">
          View and reply to WhatsApp conversations
        </p>
      </div>
      <div className="flex h-[calc(100vh-12rem)] overflow-hidden rounded-xl border bg-background">
        <div className="w-full max-w-sm border-r">
          <ConversationList />
        </div>
        <div className="hidden flex-1 items-center justify-center text-muted-foreground md:flex">
          Select a conversation to start chatting
        </div>
      </div>
    </div>
  );
}
