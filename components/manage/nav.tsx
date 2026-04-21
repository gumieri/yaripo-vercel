"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Trophy, Users } from "lucide-react"

const navItems = [
  { href: "/manage", label: "Visão Geral", icon: LayoutDashboard },
  { href: "/manage/events", label: "Eventos", icon: Trophy },
  { href: "/manage/invitations", label: "Convites", icon: Users },
]

export function ManageNav() {
  const pathname = usePathname()

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
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
