"use client";

import useSWR from "swr";
import { Users, UsersRound, Send, MessageSquare } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Stats {
  contactCount: number;
  groupCount: number;
  messagesSentToday: number;
  unreadChats: number;
  lastSync?: { createdAt: string; added: number; updated: number } | null;
}

export default function DashboardPage() {
  const { data, isLoading } = useSWR<Stats>("/api/stats", fetcher, {
    refreshInterval: 30000,
  });

  const cards = [
    {
      title: "Contacts",
      value: data?.contactCount ?? 0,
      description: "Synced from Google Sheets",
      icon: Users,
    },
    {
      title: "Groups",
      value: data?.groupCount ?? 0,
      description: "Recipient groups created",
      icon: UsersRound,
    },
    {
      title: "Sent today",
      value: data?.messagesSentToday ?? 0,
      description: "Outbound WhatsApp messages",
      icon: Send,
    },
    {
      title: "Unread chats",
      value: data?.unreadChats ?? 0,
      description: "Conversations needing attention",
      icon: MessageSquare,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-muted-foreground">
          Your WhatsApp messaging dashboard at a glance
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className="size-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-3xl font-bold">{card.value}</div>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Last sheet sync</CardTitle>
          <CardDescription>
            Most recent contact import from Google Sheets
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-5 w-48" />
          ) : data?.lastSync ? (
            <p className="text-sm">
              {formatDistanceToNow(new Date(data.lastSync.createdAt), {
                addSuffix: true,
              })}
              {" · "}
              {data.lastSync.added} added, {data.lastSync.updated} updated
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No sync yet. Go to Contacts and click Sync from Sheet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
