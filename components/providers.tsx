"use client"

import { useEffect } from "react"
import { useAuthStore } from "@/lib/auth"

export function Providers({ children }: { children: React.ReactNode }) {
  const initAuth = useAuthStore((s) => s.initAuth)

  useEffect(() => {
    initAuth()
  }, [initAuth])

  return <>{children}</>
}
