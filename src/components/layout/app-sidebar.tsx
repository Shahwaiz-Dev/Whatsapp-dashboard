"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UsersRound,
  Send,
  MessageSquare,
  LogOut,
  MessageCircle,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { useLocale } from "@/components/providers/locale-provider";
import type { TranslationKey } from "@/lib/i18n";

const navItems: {
  href: string;
  labelKey: TranslationKey;
  icon: typeof LayoutDashboard;
}[] = [
  { href: "/dashboard", labelKey: "nav.overview", icon: LayoutDashboard },
  { href: "/dashboard/contacts", labelKey: "nav.contacts", icon: Users },
  { href: "/dashboard/groups", labelKey: "nav.groups", icon: UsersRound },
  { href: "/dashboard/compose", labelKey: "nav.compose", icon: Send },
  { href: "/dashboard/chat", labelKey: "nav.chat", icon: MessageSquare },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLocale();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-red-600 text-white">
            <MessageCircle className="size-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">Gymclub</p>
            <p className="text-xs text-muted-foreground">
              {t("nav.memberMessaging")}
            </p>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("nav.navigation")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href));
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{t(item.labelKey)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border space-y-1 p-2">
        <LanguageSwitcher />
        <Button
          variant="ghost"
          className="w-full justify-start gap-2"
          onClick={handleLogout}
        >
          <LogOut className="size-4" />
          {t("nav.signOut")}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { t } = useLocale();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="text-sm text-muted-foreground">
            {t("nav.headerSubtitle")}
          </span>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
