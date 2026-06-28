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
      if (!res.ok) throw new Error(result.error ?? "Sync failed");
      toast.success(
        `Synced: ${result.added} added, ${result.updated} updated, ${result.skipped} skipped`
      );
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {!selectable && (
          <Button
            onClick={handleSync}
            disabled={syncing}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <RefreshCw
              className={`mr-2 size-4 ${syncing ? "animate-spin" : ""}`}
            />
            {syncing ? "Syncing..." : "Sync from Sheet"}
          </Button>
        )}
      </div>

      {!compact && data && (
        <p className="text-sm text-muted-foreground">
          {total.toLocaleString()} contact{total !== 1 ? "s" : ""}
          {debouncedSearch ? ` matching "${debouncedSearch}"` : ""}
          {isValidating && !syncing ? " · Updating..." : ""}
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
                    aria-label="Select all on this page"
                  />
                </TableHead>
              )}
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
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
                  No contacts found. Sync from Google Sheets to get started.
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
                    {contact.name ?? "—"}
                  </TableCell>
                  <TableCell>{formatPhoneDisplay(contact.phone)}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">
                    {contact.email ?? "—"}
                  </TableCell>
                  <TableCell>
                    {contact.canReply ? (
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                        Can reply
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Template required</Badge>
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
            Page {page} of {totalPages}
            {" · "}
            Showing {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isValidating}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isValidating}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {selectable && selectedIds.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {selectedIds.length} selected across all pages
        </p>
      )}
    </div>
  );
}

export function ContactsPageContent() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
        <p className="text-muted-foreground">
          Manage contacts synced from your Google Sheet
        </p>
      </div>
      <ContactsTable />
    </div>
  );
}
