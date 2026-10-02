"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Bell, ChevronDown, LogOut, Menu, Search, Settings, ArrowLeftRight, UserRound, X } from "lucide-react";
import { Logo } from "./Logo";
import { adminNav, userBottomNav, userNav, type NavGroup } from "./navConfig";
import { Avatar } from "@/components/ui/Avatar";
import { Dropdown } from "@/components/ui/Dropdown";
import { cn } from "@/lib/utils";
import { authService } from "@/services/authService";
import type { BloodGroup, UserRole } from "@/types";

interface ShellUser { name: string; email: string; bloodGroup?: BloodGroup; role?: UserRole }

function isActive(pathname: string, href: string) {
  if (href === "/dashboard" || href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

function SideNav({ groups, pathname, onNavigate, variant, badges = {} }: { groups: NavGroup[]; pathname: string; onNavigate?: () => void; variant: "user" | "admin"; badges?: Record<string, number> }) {
  return (
    <nav aria-label={variant === "admin" ? "Admin" : "Dashboard"} className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
      {groups.map((g, gi) => (
        <div key={gi}>
          {g.label && <p className="mb-1.5 px-3 text-xs font-medium text-ink-400">{g.label}</p>}
          <ul className="space-y-0.5">
            {g.items.map((it) => {
              const active = isActive(pathname, it.href);
              const Icon = it.icon;
              const badge = badges[it.href] ?? it.badge ?? 0;
              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hemo-500",
                      active ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-50 hover:text-ink-900",
                    )}
                  >
                    <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-white" : it.emphasis ? "text-hemo-600" : "text-ink-400 group-hover:text-ink-600")} aria-hidden />
                    <span className="flex-1 truncate">{it.label}</span>
                    {badge ? (
                      <span className={cn("rounded-full px-1.5 text-[11px] font-semibold tabular-nums", active ? "bg-white/20 text-white" : it.emphasis ? "bg-hemo-600 text-white" : "bg-ink-100 text-ink-600")}>
                        {badge > 99 ? "99+" : badge}
                        <span className="sr-only"> new</span>
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AppShell({ variant, user, unread = 0, badges, children }: { variant: "user" | "admin"; user: ShellUser; unread?: number; badges?: Record<string, number>; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);
  const groups = variant === "admin" ? adminNav : userNav;
  const base = variant === "admin" ? "/admin" : "/dashboard";

  useEffect(() => {
    document.body.style.overflow = drawer ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [drawer]);

  const logout = async () => {
    await authService.logout();
    router.replace("/auth/login");
    router.refresh();
  };

  // Close the drawer whenever the route changes (e.g. browser back).
  useEffect(() => setDrawer(false), [pathname]);
  const footer = (
    <div className="border-t border-line p-3">
      <button onClick={logout} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-ink-600 hover:bg-ink-50 hover:text-ink-900">
        <LogOut className="h-[18px] w-[18px] text-ink-400" aria-hidden /> Log out
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-paper">
      <a href="#main" className="sr-only z-[70] rounded bg-white px-4 py-2 font-semibold focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-white lg:flex">
        <div className="flex h-16 items-center border-b border-line px-5">
          <Logo href={base} sub={variant === "admin" ? "Admin console" : undefined} />
        </div>
        <SideNav groups={groups} pathname={pathname} variant={variant} badges={badges} />
        {footer}
      </aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 animate-fade-in bg-ink-900/40" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[82%] max-w-xs animate-slide-up flex-col bg-white shadow-pop">
            <div className="flex h-16 items-center justify-between border-b border-line px-5">
              <Logo href={base} sub={variant === "admin" ? "Admin console" : undefined} />
              <button onClick={() => setDrawer(false)} className="rounded p-1.5 text-ink-500 hover:bg-ink-50" aria-label="Close menu">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <SideNav groups={groups} pathname={pathname} onNavigate={() => setDrawer(false)} variant={variant} badges={badges} />
            {footer}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-white/95 px-4 backdrop-blur sm:px-6">
          <button onClick={() => setDrawer(true)} className="-ml-1 rounded p-2 text-ink-600 hover:bg-ink-50 lg:hidden" aria-label="Open menu">
            <Menu className="h-5 w-5" aria-hidden />
          </button>
          <div className="min-w-0 lg:hidden">
            <Logo href={base} />
          </div>

          <form
            role="search"
            className="relative hidden max-w-md flex-1 md:block"
            onSubmit={(e) => {
              e.preventDefault();
              const q = new FormData(e.currentTarget).get("q");
              router.push(variant === "admin" ? `/admin/users?q=${encodeURIComponent(String(q ?? ""))}` : `/dashboard/donors?q=${encodeURIComponent(String(q ?? ""))}`);
            }}
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
            <input
              name="q"
              type="search"
              aria-label={variant === "admin" ? "Search users" : "Search donors by area"}
              placeholder={variant === "admin" ? "Search users, donors, requests" : "Search donors by area or blood group"}
              className="h-10 w-full rounded border border-line bg-paper pl-9 pr-3 text-sm placeholder:text-ink-400 focus:border-hemo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-hemo-500/30"
            />
          </form>

          <div className="ml-auto flex items-center gap-0.5 sm:gap-2">
            <Link href={variant === "admin" ? "/admin/users" : "/dashboard/donors"} className="rounded p-2 text-ink-600 hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hemo-500 md:hidden" aria-label={variant === "admin" ? "Search users" : "Find donors"}>
              <Search className="h-5 w-5" aria-hidden />
            </Link>
            <Link href="/dashboard/notifications" className="relative rounded p-2 text-ink-600 hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hemo-500" aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}>
              <Bell className="h-5 w-5" aria-hidden />
              {unread > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-hemo-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white" aria-hidden>
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>

            <Dropdown
              label="Account"
              trigger={({ open, toggle, id }) => (
                <button onClick={toggle} aria-expanded={open} aria-haspopup="menu" aria-controls={id} className="flex items-center gap-2 rounded-md p-1 pr-2 hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hemo-500">
                  <Avatar name={user.name} size="sm" />
                  <span className="hidden text-left sm:block">
                    <span className="block text-[13px] font-semibold leading-tight text-ink-900">{user.name}</span>
                    <span className="block text-[11px] leading-tight text-ink-500">{variant === "admin" ? "Administrator" : `${user.role === "donor" ? "Donor" : "Member"}${user.bloodGroup ? `, ${user.bloodGroup}` : ""}`}</span>
                  </span>
                  <ChevronDown className="hidden h-4 w-4 text-ink-400 sm:block" aria-hidden />
                </button>
              )}
              items={[
                ...(variant === "user" ? [{ label: "My profile", icon: <UserRound className="h-4 w-4" aria-hidden />, onSelect: () => router.push("/dashboard/profile") }] : []),
                { label: "Settings", icon: <Settings className="h-4 w-4" aria-hidden />, onSelect: () => router.push(`${base}/settings`) },
                ...(variant === "admin" || user.role === "admin" ? [{ label: variant === "admin" ? "Switch to donor view" : "Open admin console", icon: <ArrowLeftRight className="h-4 w-4" aria-hidden />, onSelect: () => router.push(variant === "admin" ? "/dashboard" : "/admin") }] : []),
                { label: "Log out", icon: <LogOut className="h-4 w-4" aria-hidden />, onSelect: logout, tone: "danger" },
              ]}
            >
              <div className="border-b border-line px-3 pb-2 pt-1.5">
                <p className="text-sm font-semibold text-ink-900">{user.name}</p>
                <p className="truncate text-xs text-ink-500">{user.email}</p>
              </div>
            </Dropdown>
          </div>
        </header>

        <main id="main" className={cn("mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8", variant === "user" && "pb-24 lg:pb-8")}>
          {children}
        </main>
      </div>

      {variant === "user" && (
        <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
          <ul className="grid grid-cols-5">
            {userBottomNav.map((it) => {
              const Icon = it.icon;
              const active = isActive(pathname, it.href);
              return (
                <li key={it.href}>
                  <Link href={it.href} aria-current={active ? "page" : undefined} className={cn("flex flex-col items-center gap-1 py-2 text-[11px] font-medium", active ? "text-ink-900" : "text-ink-500")}>
                    {it.emphasis ? (
                      <span className="-mt-5 flex h-11 w-11 items-center justify-center rounded-full bg-hemo-600 text-white shadow-pop ring-4 ring-white">
                        <Icon className="h-5 w-5" aria-hidden />
                      </span>
                    ) : (
                      <Icon className={cn("h-5 w-5", active ? "text-ink-900" : "text-ink-400")} aria-hidden />
                    )}
                    {it.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}
