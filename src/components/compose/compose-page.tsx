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
import { useLocale } from "@/components/providers/locale-provider";

interface Group {
  id: string;
  name: string;
  _count: { members: number };
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function ComposePageContent() {
  const { t } = useLocale();
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
      toast.error(t("compose.enterMessage"));
      return;
    }
    if (contactIds.length === 0 && groupIds.length === 0) {
      toast.error(t("compose.selectRecipient"));
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

      if (!res.ok) throw new Error(data.error ?? t("compose.sendFailed"));

      setResults(data.results ?? []);
      toast.success(
        t("compose.sendSuccess", {
          success: data.successCount ?? 0,
          total: data.results?.length ?? 0,
        })
      );
      if (data.failedCount) {
        toast.warning(
          t("compose.sendPartialFail", { count: data.failedCount })
        );
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("compose.sendFailed")
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("compose.title")}
        </h1>
        <p className="text-muted-foreground">{t("compose.subtitle")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("compose.recipients")}</CardTitle>
            <CardDescription>{t("compose.recipientsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="contacts">
              <TabsList className="mb-4">
                <TabsTrigger value="contacts">{t("common.contacts")}</TabsTrigger>
                <TabsTrigger value="groups">{t("common.groups")}</TabsTrigger>
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
                    {t("compose.noGroups")}
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
                          {t("groups.members", {
                            count: group._count.members,
                          })}
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
              <CardTitle>{t("compose.message")}</CardTitle>
              <CardDescription>{t("compose.messageDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="message">{t("compose.messageBody")}</Label>
                <Textarea
                  id="message"
                  placeholder={t("compose.messagePlaceholder")}
                  rows={8}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {t("compose.charCount", { count: message.length })}
                </p>
              </div>

              {selectedContacts.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-red-100 text-red-800">
                    {t("compose.canReceive", { count: canReplyCount })}
                  </Badge>
                  {templateRequiredCount > 0 && (
                    <Badge variant="destructive">
                      {t("compose.needTemplate", {
                        count: templateRequiredCount,
                      })}
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
                    {t("compose.sending")}
                  </>
                ) : (
                  <>
                    <Send className="mr-2 size-4" />
                    {t("compose.sendMessage")}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {results.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("compose.sendResults")}</CardTitle>
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
                      {r.success ? t("common.sent") : r.error ?? t("common.failed")}
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
