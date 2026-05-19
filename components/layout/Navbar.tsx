"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { Menu } from "lucide-react"
import { useAuthStore } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/pricing", label: "Pricing" },
]

function NavLogo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <div className="size-8 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
        <span className="text-white font-bold text-sm font-sora">N</span>
      </div>
      <span className="text-slate-900 font-semibold text-lg font-sora hidden sm:block">NairaFlow</span>
    </Link>
  )
}

function NavLinks({ pathname, onClick }: { pathname: string; onClick?: () => void }) {
  return (
    <>
      {NAV_LINKS.map(({ href, label }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            onClick={onClick}
            className={cn(
              "text-sm font-medium transition-colors py-1",
              active
                ? "text-green-700 border-b-2 border-green-600"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            {label}
          </Link>
        )
      })}
    </>
  )
}

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { isAuthenticated, user, clearAuth } = useAuthStore()
  const [mobileOpen, setMobileOpen] = useState(false)

  function handleLogout() {
    clearAuth()
    router.push("/login")
  }

  const initials = user
    ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    : "?"

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        <NavLogo />

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-6">
          <NavLinks pathname={pathname} />
        </nav>

        {/* Desktop right side */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-full hover:bg-slate-50 px-2 py-1 transition-colors">
                <span className="text-sm text-slate-700 font-medium">{user.first_name}</span>
                <Avatar className="size-8">
                  <AvatarFallback className="bg-green-100 text-green-700 text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => router.push("/dashboard")}>
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  data-variant="destructive"
                  className="text-red-600 focus:text-red-600"
                >
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link
                href="/login"
                className={cn(buttonVariants({ variant: "ghost" }), "text-slate-700")}
              >
                Login
              </Link>
              <Link
                href="/register"
                className={cn(buttonVariants(), "bg-green-600 hover:bg-green-700 text-white border-green-600")}
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger className="md:hidden inline-flex items-center justify-center size-8 rounded-md hover:bg-slate-100 transition-colors">
            <Menu className="size-5 text-slate-700" />
            <span className="sr-only">Menu</span>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 pt-10">
            <nav className="flex flex-col gap-5 px-2">
              <NavLinks pathname={pathname} onClick={() => setMobileOpen(false)} />
              <div className="border-t pt-4 flex flex-col gap-2">
                {isAuthenticated && user ? (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="size-8">
                        <AvatarFallback className="bg-green-100 text-green-700 text-xs font-semibold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-slate-800">{user.first_name}</span>
                    </div>
                    <Link
                      href="/dashboard"
                      onClick={() => setMobileOpen(false)}
                      className="text-sm text-slate-700 py-1.5 hover:text-slate-900"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/dashboard/settings"
                      onClick={() => setMobileOpen(false)}
                      className="text-sm text-slate-700 py-1.5 hover:text-slate-900"
                    >
                      Settings
                    </Link>
                    <button
                      onClick={() => { setMobileOpen(false); handleLogout() }}
                      className="text-sm text-red-600 py-1.5 text-left hover:text-red-700"
                    >
                      Log out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setMobileOpen(false)}
                      className={cn(buttonVariants({ variant: "ghost" }), "justify-start text-slate-700 w-full")}
                    >
                      Login
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setMobileOpen(false)}
                      className={cn(buttonVariants(), "bg-green-600 hover:bg-green-700 text-white border-green-600 w-full justify-center")}
                    >
                      Get Started
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
