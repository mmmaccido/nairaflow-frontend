"use client"

import { useEffect, useState } from "react"
import { useAuthStore } from "@/lib/auth"

export function Providers({ children }: { children: React.ReactNode }) {
  const initAuth = useAuthStore((s) => s.initAuth)
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    initAuth()
  }, [initAuth])

  useEffect(() => {
    setIsOnline(navigator.onLine)
    const handleOnline  = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener("online",  handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online",  handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return (
    <>
      {children}
      {!isOnline && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg whitespace-nowrap">
          <span className="size-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
          You&apos;re offline. Some features may not work.
        </div>
      )}
    </>
  )
}
