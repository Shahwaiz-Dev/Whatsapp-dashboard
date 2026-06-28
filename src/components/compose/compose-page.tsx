"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { useSearchParams } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContactsTable } from "@/components/contacts/contacts-table";
import type { ContactRow } from "@/components/contacts/contacts-table";
import { formatPhoneDisplay } from "@/lib/phone";

interface Group {
  id: string;
  name: string;
  _count: { members: number };
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function ComposePageContent() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("");
  const [contactIds, setContactIds] = useState<string[]>([]);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<
    { contactName: string | null; phone: string; success: boolean; error?: string }[]
  >([]);

  const selectedIdsKey =
    contactIds.length > 0
      ? `/api/contacts?ids=${contactIds.join(",")}`
      : null;
  const { data: selectedData } = useSWR<{ contacts: ContactRow[] }>(
    selectedIdsKey,
    fetcher
  );
  const { data: groups } = useSWR<Group[]>("/api/groups", fetcher);

  useEffect(() => {
    const preselected = searchParams.get("contacts");
    if (preselected) {
      setContactIds(preselected.split(",").filter(Boolean));
    }
  }, [searchParams]);

  const selectedContacts = selectedData?.contacts ?? [];

  const canReplyCount = selectedContacts.filter((c) => c.canReply).length;
  const templateRequiredCount = selectedContacts.length - canReplyCount;

  function toggleGroup(id: string) {
    setGroupIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSend() {
    if (!message.trim()) {
      toast.error("Enter a message");
      return;
    }
    if (contactIds.length === 0 && groupIds.length === 0) {
      toast.error("Select at least one contact or group");
      return;
    }

    setSending(true);
    setResults([]);

    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: message, contactIds, groupIds }),
      });
      const data = (await res.json()) as {
        results?: typeof results;
        error?: string;
        successCount?: number;
        failedCount?: number;
      };

      if (!res.ok) throw new Error(data.error ?? "Send failed");

      setResults(data.results ?? []);
      toast.success(
        `Sent ${data.successCount}/${data.results?.length ?? 0} messages`
      );
      if (data.failedCount) {
        toast.warning(`${data.failedCount} messages failed`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Compose</h1>
        <p className="text-muted-foreground">
          Select recipients and send WhatsApp messages
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recipients</CardTitle>
            <CardDescription>
              Select individual contacts and/or groups
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="contacts">
              <TabsList className="mb-4">
                <TabsTrigger value="contacts">Contacts</TabsTrigger>
                <TabsTrigger value="groups">Groups</TabsTrigger>
              </TabsList>
              <TabsContent value="contacts">
                <ContactsTable
                  selectable
                  compact
                  selectedIds={contactIds}
                  onSelectionChange={setContactIds}
                />
              </TabsContent>
              <TabsContent value="groups" className="space-y-3">
                {!groups?.length ? (
                  <p className="text-sm text-muted-foreground">
                    No groups created yet.
                  </p>
                ) : (
                  groups.map((group) => (
                    <label
                      key={group.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={groupIds.includes(group.id)}
                        onCheckedChange={() => toggleGroup(group.id)}
                      />
                      <div className="flex-1">
                        <p className="font-medium">{group.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {group._count.members} members
                        </p>
                      </div>
                    </label>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Message</CardTitle>
              <CardDescription>
                Free-form text works within 24h of last inbound reply
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="message">Message body</Label>
                <Textarea
                  id="message"
                  placeholder="Type your WhatsApp message..."
                  rows={8}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {message.length} / 4096 characters
                </p>
              </div>

              {selectedContacts.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-red-100 text-red-800">
                    {canReplyCount} can receive
                  </Badge>
                  {templateRequiredCount > 0 && (
                    <Badge variant="destructive">
                      {templateRequiredCount} need template
                    </Badge>
                  )}
                </div>
              )}

              <Button
                className="w-full bg-red-600 hover:bg-red-700"
                onClick={handleSend}
                disabled={sending}
              >
                {sending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 size-4" />
                    Send message
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {results.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Send results</CardTitle>
              </CardHeader>
              <CardContent className="max-h-64 space-y-2 overflow-y-auto">
                {results.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded border px-3 py-2 text-sm"
                  >
                    <span>
                      {r.contactName ?? formatPhoneDisplay(r.phone)}
                    </span>
                    <Badge variant={r.success ? "default" : "destructive"}>
                      {r.success ? "Sent" : r.error ?? "Failed"}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
