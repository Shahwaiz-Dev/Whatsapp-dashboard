import { ChatPageContent } from "@/components/chat/chat-page";

export default async function ChatContactPage({
  params,
}: {
  params: Promise<{ contactId: string }>;
}) {
  const { contactId } = await params;
  return <ChatPageContent contactId={contactId} />;
}
