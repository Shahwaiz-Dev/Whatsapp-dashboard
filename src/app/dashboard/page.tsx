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
import { useLocale } from "@/components/providers/locale-provider";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Stats {
  contactCount: number;
  groupCount: number;
  messagesSentToday: number;
  unreadChats: number;
  lastSync?: { createdAt: string; added: number; updated: number } | null;
}

export default function DashboardPage() {
  const { t, dateLocale } = useLocale();
  const { data, isLoading } = useSWR<Stats>("/api/stats", fetcher, {
    refreshInterval: 30000,
  });

  const cards = [
    {
      title: t("dashboard.contactsCard"),
      value: data?.contactCount ?? 0,
      description: t("dashboard.contactsDesc"),
      icon: Users,
    },
    {
      title: t("dashboard.groupsCard"),
      value: data?.groupCount ?? 0,
      description: t("dashboard.groupsDesc"),
      icon: UsersRound,
    },
    {
      title: t("dashboard.sentToday"),
      value: data?.messagesSentToday ?? 0,
      description: t("dashboard.sentTodayDesc"),
      icon: Send,
    },
    {
      title: t("dashboard.unreadChats"),
      value: data?.unreadChats ?? 0,
      description: t("dashboard.unreadChatsDesc"),
      icon: MessageSquare,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("dashboard.title")}
        </h1>
        <p className="text-muted-foreground">{t("dashboard.subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className="size-4 text-red-600" />
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
          <CardTitle>{t("dashboard.lastSync")}</CardTitle>
          <CardDescription>{t("dashboard.lastSyncDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-5 w-48" />
          ) : data?.lastSync ? (
            <p className="text-sm">
              {formatDistanceToNow(new Date(data.lastSync.createdAt), {
                addSuffix: true,
                locale: dateLocale,
              })}
              {" · "}
              {t("dashboard.lastSyncDetail", {
                added: data.lastSync.added,
                updated: data.lastSync.updated,
              })}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("dashboard.noSync")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
