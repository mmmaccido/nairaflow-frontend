import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { COOKIE_NAME, ROLE_COOKIE_NAME } from "@/lib/constants"

const PROTECTED_PREFIXES = ["/dashboard", "/admin"]
const AUTH_ROUTES = ["/login", "/register"]

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get(COOKIE_NAME)?.value
  const role  = request.cookies.get(ROLE_COOKIE_NAME)?.value

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
  const isAuthRoute = AUTH_ROUTES.some((p) => pathname.startsWith(p))

  // No token → redirect to login
  if (isProtected && !token) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("from", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Already logged in → redirect away from auth pages
  if (isAuthRoute && token) {
    const dest = role === "admin" ? "/admin" : "/dashboard"
    return NextResponse.redirect(new URL(dest, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
}
