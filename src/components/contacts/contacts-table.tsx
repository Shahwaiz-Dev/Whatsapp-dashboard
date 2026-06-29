"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  Send,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPhoneDisplay } from "@/lib/phone";
import { useLocale } from "@/components/providers/locale-provider";

export interface ContactRow {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  canReply: boolean;
  _count: { groups: number };
}

interface ContactsResponse {
  contacts: ContactRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const PAGE_SIZE = 25;

interface ContactsTableProps {
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  compact?: boolean;
}

export function ContactsTable({
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  compact = false,
}: ContactsTableProps) {
  const { t } = useLocale();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(PAGE_SIZE),
  });
  if (debouncedSearch) query.set("search", debouncedSearch);

  const { data, isLoading, isValidating, mutate } = useSWR<ContactsResponse>(
    `/api/contacts?${query.toString()}`,
    fetcher,
    { keepPreviousData: true }
  );

  const contacts = data?.contacts ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const isInitialLoad = isLoading && !data;

  const pageSelectedCount = contacts.filter((c) =>
    selectedIds.includes(c.id)
  ).length;
  const allPageSelected =
    contacts.length > 0 && pageSelectedCount === contacts.length;

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/contacts/sync", { method: "POST" });
      const result = (await res.json()) as {
        added?: number;
        updated?: number;
        skipped?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(result.error ?? t("contacts.syncFailed"));
      toast.success(
        t("contacts.syncSuccess", {
          added: result.added ?? 0,
          updated: result.updated ?? 0,
          skipped: result.skipped ?? 0,
        })
      );
      await mutate();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("contacts.syncFailed")
      );
    } finally {
      setSyncing(false);
    }
  }

  function toggleAllOnPage() {
    if (!onSelectionChange) return;
    const pageIds = contacts.map((c) => c.id);
    if (allPageSelected) {
      onSelectionChange(selectedIds.filter((id) => !pageIds.includes(id)));
    } else {
      onSelectionChange([...new Set([...selectedIds, ...pageIds])]);
    }
  }

  function toggleOne(id: string) {
    if (!onSelectionChange) return;
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((x) => x !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  }

  const contactCountLabel =
    total === 1
      ? t("contacts.contactCountOne", { count: total })
      : t("contacts.contactCountOther", { count: total });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("contacts.searchPlaceholder")}
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {!selectable && (
          <Button
            onClick={handleSync}
            disabled={syncing}
            className="bg-red-600 hover:bg-red-700"
          >
            <RefreshCw
              className={`mr-2 size-4 ${syncing ? "animate-spin" : ""}`}
            />
            {syncing ? t("contacts.syncing") : t("contacts.syncFromSheet")}
          </Button>
        )}
      </div>

      {!compact && data && (
        <p className="text-sm text-muted-foreground">
          {contactCountLabel}
          {debouncedSearch
            ? t("contacts.matching", { query: debouncedSearch })
            : ""}
          {isValidating && !syncing ? t("contacts.updating") : ""}
        </p>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={allPageSelected}
                    onCheckedChange={toggleAllOnPage}
                    aria-label={t("contacts.selectAll")}
                  />
                </TableHead>
              )}
              <TableHead>{t("common.name")}</TableHead>
              <TableHead>{t("common.phone")}</TableHead>
              <TableHead>{t("common.email")}</TableHead>
              <TableHead>{t("contacts.status")}</TableHead>
              {!selectable && <TableHead className="w-20" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isInitialLoad ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={selectable ? 6 : 5}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : contacts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={selectable ? 6 : 5}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("contacts.noContacts")}
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((contact) => (
                <TableRow
                  key={contact.id}
                  className={isValidating && syncing ? "opacity-70" : undefined}
                >
                  {selectable && (
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(contact.id)}
                        onCheckedChange={() => toggleOne(contact.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium">
                    {contact.name?.trim() ? contact.name : t("common.unknown")}
                  </TableCell>
                  <TableCell>{formatPhoneDisplay(contact.phone)}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">
                    {contact.email ?? "—"}
                  </TableCell>
                  <TableCell>
                    {contact.canReply ? (
                      <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                        {t("contacts.canReply")}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        {t("contacts.templateRequired")}
                      </Badge>
                    )}
                  </TableCell>
                  {!selectable && (
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link
                          href={`/dashboard/compose?contacts=${contact.id}`}
                        >
                          <Send className="size-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {t("contacts.pageOf", { page, totalPages })}
            {" · "}
            {t("contacts.showing", {
              from: (page - 1) * PAGE_SIZE + 1,
              to: Math.min(page * PAGE_SIZE, total),
              total: total.toLocaleString(),
            })}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isValidating}
            >
              <ChevronLeft className="size-4" />
              {t("common.previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isValidating}
            >
              {t("common.next")}
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {selectable && selectedIds.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {t("contacts.selectedAcrossPages", { count: selectedIds.length })}
        </p>
      )}
    </div>
  );
}

export function ContactsPageContent() {
  const { t } = useLocale();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("contacts.title")}
        </h1>
        <p className="text-muted-foreground">{t("contacts.subtitle")}</p>
      </div>
      <ContactsTable />
    </div>
  );
}
