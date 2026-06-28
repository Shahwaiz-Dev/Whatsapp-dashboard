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

interface Group {
  id: string;
  name: string;
  description: string | null;
  members: { contact: { id: string; name: string | null; phone: string } }[];
  _count: { members: number };
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function GroupsPageContent() {
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
      if (!res.ok) throw new Error("Failed to create group");
      toast.success("Group created");
      setCreateOpen(false);
      setName("");
      setDescription("");
      setSelectedContactIds([]);
      await mutate();
    } catch {
      toast.error("Failed to create group");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this group?")) return;
    await fetch(`/api/groups/${id}`, { method: "DELETE" });
    toast.success("Group deleted");
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
      if (!res.ok) throw new Error("Failed to add members");
      toast.success("Members added");
      setMemberOpen(null);
      setSelectedContactIds([]);
      await mutate();
    } catch {
      toast.error("Failed to add members");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Groups</h1>
          <p className="text-muted-foreground">
            Organize contacts into recipient groups
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-red-600 hover:bg-red-700">
              <Plus className="mr-2 size-4" />
              New group
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create group</DialogTitle>
              <DialogDescription>
                Add a name and optionally select initial members
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="group-name">Name</Label>
                <Input
                  id="group-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. VIP Customers"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="group-desc">Description</Label>
                <Textarea
                  id="group-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
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
                Create group
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
            No groups yet. Create your first group to organize recipients.
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
                  {group._count.members} members
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
                      +{group.members.length - 5} more
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
                        Add members
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Add members to {group.name}</DialogTitle>
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
                          Add selected
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
