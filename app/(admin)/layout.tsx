"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { LayoutDashboard, ArrowRightLeft, TrendingUp, Menu, LogOut, ShieldCheck } from "lucide-react"
import { useAuthStore } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const ADMIN_LINKS = [
  { href: "/admin",              label: "Dashboard",    icon: LayoutDashboard, exact: true },
  { href: "/admin/transactions", label: "Transactions", icon: ArrowRightLeft },
  { href: "/admin/rates",        label: "Rates",        icon: TrendingUp },
]

function AdminNav({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const router  = useRouter()
  const { user, clearAuth } = useAuthStore()
  const initials = user ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase() : "A"

  function handleLogout() {
    clearAuth()
    router.push("/login")
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-slate-100">
        <Link href="/admin" className="flex items-center gap-2" onClick={onNavigate}>
          <div className="size-8 rounded-full bg-slate-800 flex items-center justify-center">
            <ShieldCheck className="size-4 text-white" />
          </div>
          <div>
            <span className="text-slate-900 font-semibold font-sora text-sm">NairaFlow</span>
            <p className="text-xs text-slate-500 -mt-0.5">Admin panel</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {ADMIN_LINKS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border-l-4 pl-2.5",
                active
                  ? "bg-slate-800 text-white border-slate-800"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-transparent"
              )}
            >
              <Icon className="size-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
        <div className="pt-3 border-t border-slate-100 mt-3">
          <Link
            href="/dashboard"
            onClick={onNavigate}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors border-l-4 border-transparent pl-2.5"
          >
            <LayoutDashboard className="size-4 flex-shrink-0" />
            User dashboard
          </Link>
        </div>
      </nav>

      <div className="px-4 py-4 border-t border-slate-100">
        {user && (
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="size-9">
              <AvatarFallback className="bg-slate-800 text-white text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{user.first_name} {user.last_name}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-slate-600 hover:text-red-600 hover:bg-red-50 gap-2"
          onClick={handleLogout}
        >
          <LogOut className="size-4" />
          Log out
        </Button>
      </div>
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-shrink-0 flex-col bg-white border-r border-slate-100 min-h-screen sticky top-0 max-h-screen">
        <AdminNav pathname={pathname} />
      </aside>

      {/* Mobile sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className="md:hidden fixed top-3 left-3 z-50 bg-white shadow-sm border border-slate-200 p-2 rounded-md">
          <Menu className="size-5 text-slate-700" />
          <span className="sr-only">Open menu</span>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <AdminNav pathname={pathname} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <main className="flex-1 overflow-y-auto">
        <div className="p-6 pt-16 md:pt-6 max-w-7xl">{children}</div>
      </main>
    </div>
  )
}
