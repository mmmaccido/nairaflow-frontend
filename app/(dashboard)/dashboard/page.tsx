"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  TrendingUp, Clock, Users, DollarSign, AlertTriangle, X,
  Globe, Building2, Truck, Smartphone, ArrowRightLeft,
  SendHorizonal, UserPlus,
} from "lucide-react"
import { useAuthStore } from "@/lib/auth"
import apiClient from "@/lib/api"
import { handleApiError } from "@/lib/handleApiError"
import { ErrorAlert } from "@/components/shared/ErrorAlert"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { Transaction } from "@/types/transaction"
import type { Rate } from "@/types/rate"

interface Paginated<T> { data: T[]; total: number; current_page: number; last_page: number }
interface KYCStatusRes { kyc_tier: number; kyc_status: string; bvn_verified: boolean; daily_limit: number; remaining_today: number }

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  COMPLETED:  { color: "bg-emerald/10 text-emerald",     label: "Completed"  },
  PROCESSING: { color: "bg-amber/15 text-amber",         label: "Processing" },
  PAID:       { color: "bg-emerald/10 text-emerald",     label: "Paid"       },
  PENDING:    { color: "bg-bone-deep text-muted-text",   label: "Pending"    },
  FAILED:     { color: "bg-clay/10 text-clay",           label: "Failed"     },
  REFUNDED:   { color: "bg-sage/20 text-emerald-light",  label: "Refunded"   },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { color: "bg-bone-deep text-muted-text", label: status }
  return (
    <span className={cn("inline-flex text-xs font-medium px-2 py-0.5 rounded-full", cfg.color)}>
      {cfg.label}
    </span>
  )
}

function DeliveryIcon({ type }: { type: string }) {
  const map: Record<string, React.ReactNode> = {
    BANK_WIRE:         <Globe      className="size-3.5 text-muted-text" />,
    BANK_TRANSFER_NGN: <Building2  className="size-3.5 text-muted-text" />,
    CASH_PICKUP:       <Truck      className="size-3.5 text-muted-text" />,
    MOBILE_MONEY:      <Smartphone className="size-3.5 text-muted-text" />,
  }
  return <>{map[type] ?? <ArrowRightLeft className="size-3.5 text-muted-text" />}</>
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })
}

export default function DashboardPage() {
  const { user } = useAuthStore()

  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState<string | null>(null)
  const [transactions, setTransactions]     = useState<Transaction[]>([])
  const [recipientsTotal, setRecipientsTotal] = useState(0)
  const [usdRate, setUsdRate]               = useState<Rate | null>(null)
  const [kycTier, setKycTier]               = useState<number>(user?.kyc_tier ?? 0)
  const [kycDismissed, setKycDismissed]     = useState(false)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    setKycDismissed(sessionStorage.getItem("kyc_banner_dismissed") === "true")

    const [txRes, recRes, rateRes, kycRes] = await Promise.allSettled([
      apiClient.get<Paginated<Transaction>>("/transactions?per_page=100"),
      apiClient.get<Paginated<{ id: string }>>("/recipients?per_page=1"),
      apiClient.get<Rate>("/rates/USD"),
      apiClient.get<KYCStatusRes>("/kyc/status"),
    ])

    if (txRes.status   === "fulfilled") setTransactions(txRes.value.data.data)
    else setError(handleApiError(txRes.reason))
    if (recRes.status  === "fulfilled") setRecipientsTotal(recRes.value.data.total)
    if (rateRes.status === "fulfilled") setUsdRate(rateRes.value.data)
    if (kycRes.status  === "fulfilled") setKycTier(kycRes.value.data.kyc_tier)

    setLoading(false)
  }, [])

  useEffect(() => { loadDashboard() }, [loadDashboard])

  const now = new Date()
  const totalSentThisMonth = transactions
    .filter((t) => {
      const d = new Date(t.created_at)
      return t.status === "COMPLETED" && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .reduce((s, t) => s + Number(t.ngn_amount), 0)

  const activeCount = transactions.filter((t) => ["PENDING", "PAID", "PROCESSING"].includes(t.status)).length
  const recent = transactions.slice(0, 5)

  const stats = [
    { label: "Total sent this month", value: `₦${totalSentThisMonth.toLocaleString("en-NG")}`, icon: TrendingUp, color: "text-emerald bg-emerald/10" },
    { label: "Active transfers",      value: String(activeCount),                                icon: Clock,     color: "text-amber bg-amber/15" },
    { label: "Saved recipients",      value: String(recipientsTotal),                            icon: Users,     color: "text-ink-soft bg-bone-deep" },
    { label: "Today's USD rate",      value: usdRate ? `₦${usdRate.our_rate.toLocaleString("en-NG")}` : "—", icon: DollarSign, color: "text-emerald-light bg-sage/20" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-ink mb-0.5">
          Welcome back, {user?.first_name ?? "there"}!
        </h1>
        <p className="text-muted-text text-sm">Here&apos;s what&apos;s happening with your transfers.</p>
      </div>

      {error && <ErrorAlert message={error} onRetry={loadDashboard} />}

      {/* KYC alert */}
      {kycTier === 0 && !kycDismissed && (
        <div className="flex items-start gap-3 bg-amber/10 border border-amber/30 rounded-xl px-4 py-3">
          <AlertTriangle className="size-5 text-amber flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink">
              Complete identity verification to start sending money
            </p>
            <p className="text-xs text-amber mt-0.5">
              Verify your BVN to unlock transfers up to ₦1,000,000 per day.
            </p>
            <Link href="/kyc" className="inline-block mt-2 text-xs font-semibold text-ink hover:text-emerald underline underline-offset-2">
              Verify now →
            </Link>
          </div>
          <button onClick={() => { sessionStorage.setItem("kyc_banner_dismissed", "true"); setKycDismissed(true) }} className="text-amber hover:text-ink flex-shrink-0">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-paper rounded-xl border-2 border-ink shadow-sm p-5">
            <div className={cn("size-9 rounded-xl flex items-center justify-center mb-3", color)}>
              <Icon className="size-4" />
            </div>
            {loading ? (
              <>
                <Skeleton className="h-6 w-20 mb-1" />
                <Skeleton className="h-3 w-28" />
              </>
            ) : (
              <>
                <p className="text-xl font-bold font-display text-ink">{value}</p>
                <p className="text-xs text-muted-text mt-0.5">{label}</p>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/send" className="flex items-center gap-3 bg-emerald hover:bg-emerald-deep text-bone rounded-xl px-5 py-4 transition-colors border-2 border-ink shadow-sm">
          <SendHorizonal className="size-5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-sm">Send money</p>
            <p className="text-xs text-bone/60">Transfer to any country</p>
          </div>
        </Link>
        <Link href="/recipients/new" className="flex items-center gap-3 bg-paper border-2 border-ink hover:bg-bone text-ink rounded-xl px-5 py-4 transition-colors shadow-sm">
          <UserPlus className="size-5 flex-shrink-0 text-muted-text" />
          <div>
            <p className="font-semibold text-sm">Add recipient</p>
            <p className="text-xs text-muted-text">Save bank details</p>
          </div>
        </Link>
      </div>

      {/* Recent transactions */}
      <div className="bg-paper rounded-xl border-2 border-ink shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-bone-deep">
          <h2 className="font-semibold font-display text-ink">Recent transfers</h2>
          <Link href="/transactions" className="text-xs text-emerald hover:underline font-medium">
            View all transactions →
          </Link>
        </div>

        {loading ? (
          <div className="divide-y divide-bone">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <Skeleton className="size-9 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-text text-sm mb-3">No transfers yet.</p>
            <Link href="/send" className="inline-block bg-emerald hover:bg-emerald-deep text-bone text-sm font-medium px-4 py-2 rounded-lg transition-colors border-2 border-ink">
              Send your first transfer
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-bone">
            {recent.map((tx) => {
              const name = tx.recipient ? `${tx.recipient.first_name} ${tx.recipient.last_name}` : "—"
              return (
                <Link key={tx.id} href={`/transactions/${tx.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-bone transition-colors">
                  <div className="size-9 rounded-full bg-bone-deep flex items-center justify-center flex-shrink-0">
                    <DeliveryIcon type={tx.delivery_type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-text">{formatDate(tx.created_at)}</span>
                      <span className="text-xs text-bone-deep">·</span>
                      <span className="text-xs text-muted-text">{tx.target_currency}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 space-y-1">
                    <p className="text-sm font-semibold text-ink">₦{Number(tx.ngn_amount).toLocaleString("en-NG")}</p>
                    <StatusBadge status={tx.status} />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}