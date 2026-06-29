"use client";

import { useState } from "react";
import useSWR from "swr";
import { Plus, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ContactsTable } from "@/components/contacts/contacts-table";
import { formatPhoneDisplay } from "@/lib/phone";
import { useLocale } from "@/components/providers/locale-provider";

interface Group {
  id: string;
  name: string;
  description: string | null;
  members: { contact: { id: string; name: string | null; phone: string } }[];
  _count: { members: number };
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function GroupsPageContent() {
  const { t } = useLocale();
  const { data, isLoading, mutate } = useSWR<Group[]>("/api/groups", fetcher);
  const [createOpen, setCreateOpen] = useState(false);
  const [memberOpen, setMemberOpen] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          memberIds: selectedContactIds,
        }),
      });
      if (!res.ok) throw new Error(t("groups.createFailed"));
      toast.success(t("groups.created"));
      setCreateOpen(false);
      setName("");
      setDescription("");
      setSelectedContactIds([]);
      await mutate();
    } catch {
      toast.error(t("groups.createFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("groups.deleteConfirm"))) return;
    await fetch(`/api/groups/${id}`, { method: "DELETE" });
    toast.success(t("groups.deleted"));
    await mutate();
  }

  async function handleAddMembers(groupId: string) {
    if (selectedContactIds.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ add: selectedContactIds }),
      });
      if (!res.ok) throw new Error(t("groups.addMembersFailed"));
      toast.success(t("groups.membersAdded"));
      setMemberOpen(null);
      setSelectedContactIds([]);
      await mutate();
    } catch {
      toast.error(t("groups.addMembersFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("groups.title")}
          </h1>
          <p className="text-muted-foreground">{t("groups.subtitle")}</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-red-600 hover:bg-red-700">
              <Plus className="mr-2 size-4" />
              {t("groups.newGroup")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t("groups.createTitle")}</DialogTitle>
              <DialogDescription>{t("groups.createDescription")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="group-name">{t("common.name")}</Label>
                <Input
                  id="group-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("groups.namePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="group-desc">{t("common.description")}</Label>
                <Textarea
                  id="group-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("groups.descriptionPlaceholder")}
                  rows={2}
                />
              </div>
              <ContactsTable
                selectable
                compact
                selectedIds={selectedContactIds}
                onSelectionChange={setSelectedContactIds}
              />
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={saving || !name.trim()}>
                {t("groups.createGroup")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : !data?.length ? (
        <Card>
          <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
            {t("groups.noGroups")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((group) => (
            <Card key={group.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle>{group.name}</CardTitle>
                  {group.description && (
                    <CardDescription>{group.description}</CardDescription>
                  )}
                </div>
                <Badge variant="secondary">
                  {t("groups.members", { count: group._count.members })}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-1">
                  {group.members.slice(0, 5).map((m) => (
                    <Badge key={m.contact.id} variant="outline">
                      {m.contact.name ?? formatPhoneDisplay(m.contact.phone)}
                    </Badge>
                  ))}
                  {group.members.length > 5 && (
                    <Badge variant="outline">
                      {t("common.more", {
                        count: group.members.length - 5,
                      })}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Dialog
                    open={memberOpen === group.id}
                    onOpenChange={(open) => {
                      setMemberOpen(open ? group.id : null);
                      if (!open) setSelectedContactIds([]);
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <UserPlus className="mr-1 size-4" />
                        {t("groups.addMembers")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>
                          {t("groups.addMembersTitle", { name: group.name })}
                        </DialogTitle>
                      </DialogHeader>
                      <ContactsTable
                        selectable
                        compact
                        selectedIds={selectedContactIds}
                        onSelectionChange={setSelectedContactIds}
                      />
                      <DialogFooter>
                        <Button
                          onClick={() => handleAddMembers(group.id)}
                          disabled={saving || selectedContactIds.length === 0}
                        >
                          {t("groups.addSelected")}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(group.id)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
