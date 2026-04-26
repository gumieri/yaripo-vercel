"use client"

import { Link } from "@/i18n/routing"
import { usePathname } from "@/i18n/routing"
import { LayoutDashboard, Trophy, Users } from "lucide-react"
import { useTranslations } from "next-intl"

const navItems = [
  { href: "/manage", label: "Manage", icon: LayoutDashboard },
  { href: "/manage/events", label: "Events", icon: Trophy },
  { href: "/manage/invitations", label: "Invitations", icon: Users },
]

export function ManageNav() {
  const pathname = usePathname()
  const t = useTranslations('Manage')

  return (
    <aside className="hidden w-48 shrink-0 sm:block">
      <nav className="space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/manage"
              ? pathname === "/manage"
              : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t(item.label as "Manage" | "Events" | "Invitations")}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
