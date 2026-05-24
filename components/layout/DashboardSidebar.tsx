"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import {
  LayoutDashboard,
  ArrowRightLeft,
  Receipt,
  Users,
  Settings,
  ShieldCheck,
  Menu,
  LogOut,
} from "lucide-react"
import { useAuthStore } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/send", label: "Send Money", icon: ArrowRightLeft },
  { href: "/transactions", label: "Transactions", icon: Receipt },
  { href: "/recipients", label: "Recipients", icon: Users },
  { href: "/kyc", label: "KYC Verification", icon: ShieldCheck },
  { href: "/settings", label: "Settings", icon: Settings },
]

function SidebarNav({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const router = useRouter()
  const { user, clearAuth } = useAuthStore()

  const initials = user
    ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    : "?"

  function handleLogout() {
    clearAuth()
    router.push("/login")
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-bone-deep">
        <Link href="/" className="flex items-center gap-2" onClick={onNavigate}>
          <div className="size-8 rounded-lg bg-emerald flex items-center justify-center">
            <span className="text-bone font-bold text-sm font-display">N</span>
          </div>
          <span className="text-ink font-semibold font-display">NairaFlow</span>
        </Link>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border-l-4 pl-2.5",
                active
                  ? "bg-emerald/10 text-emerald border-emerald"
                  : "text-ink-soft hover:bg-bone hover:text-ink border-transparent"
              )}
            >
              <Icon className="size-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="px-4 py-4 border-t border-bone-deep">
        {user && (
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="size-9">
              <AvatarFallback className="bg-emerald/15 text-emerald text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink truncate">
                {user.first_name} {user.last_name}
              </p>
              <p className="text-xs text-muted-text truncate">{user.email}</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-ink-soft hover:text-clay hover:bg-clay/10 gap-2"
          onClick={handleLogout}
        >
          <LogOut className="size-4" />
          Log out
        </Button>
      </div>
    </div>
  )
}

export function DashboardSidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-shrink-0 flex-col bg-paper border-r border-bone-deep min-h-screen sticky top-0 max-h-screen">
        <SidebarNav pathname={pathname} />
      </aside>

      {/* Mobile Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className="md:hidden fixed top-3 left-3 z-50 bg-paper shadow-sm border border-bone-deep p-2 rounded-md">
          <Menu className="size-5 text-ink-soft" />
          <span className="sr-only">Open sidebar</span>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <SidebarNav pathname={pathname} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  )
}