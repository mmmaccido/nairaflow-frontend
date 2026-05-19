"use client"

import { useAuthStore } from "@/lib/auth"
import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardPage() {
  const { user, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold font-sora text-slate-900 mb-1">
        Welcome back, {user?.first_name ?? "there"}!
      </h1>
      <p className="text-slate-500 text-sm">Dashboard coming in Task 20.</p>
    </div>
  )
}
