"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { TrendingUp, CheckCircle2, Clock, XCircle, ChevronRight } from "lucide-react"
import apiClient from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminTx {
  id: string
  user_email: string
  recipient_name: string | null
  ngn_amount: number
  target_currency: string
  target_amount: number
  fee: number
  delivery_type: string
  status: string
  paystack_reference: string
  created_at: string
}

interface AgentSummary {
  id: string
  city: string
  cash_balance: number
  max_balance: number
  is_available: boolean
  total_deliveries: number
  balance_percentage: number
  user: { first_name: string; last_name: string } | null
}

interface AdminDashboard {
  volume_today: number
  completed_today: number
  failed_today: number
  revenue_today: number
  pending_count: number
  transactions_by_status: Record<string, number>
  transactions_by_currency: Record<string, number>
  recent_transactions: AdminTx[]
  agent_summary: AgentSummary[]
}

// ─── Status config ─────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  COMPLETED:  { color: "bg-green-100 text-green-700",   label: "Completed"  },
  PROCESSING: { color: "bg-yellow-100 text-yellow-700", label: "Processing" },
  PAID:       { color: "bg-blue-100 text-blue-600",     label: "Paid"       },
  PENDING:    { color: "bg-slate-100 text-slate-600",   label: "Pending"    },
  FAILED:     { color: "bg-red-100 text-red-700",       label: "Failed"     },
  REFUNDED:   { color: "bg-purple-100 text-purple-700", label: "Refunded"   },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const [data, setData]     = useState<AdminDashboard | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient
      .get<AdminDashboard>("/admin/dashboard")
      .then((r) => setData(r.data))
      .finally(() => setLoading(false))
  }, [])

  const stats = data ? [
    { label: "Volume today",    value: `₦${data.volume_today.toLocaleString("en-NG")}`,   icon: TrendingUp,   color: "text-green-600 bg-green-50" },
    { label: "Completed today", value: String(data.completed_today),                       icon: CheckCircle2, color: "text-blue-600 bg-blue-50" },
    { label: "Active / Pending",value: String(data.pending_count),                         icon: Clock,        color: "text-yellow-600 bg-yellow-50" },
    { label: "Failed today",    value: String(data.failed_today),                          icon: XCircle,      color: "text-red-600 bg-red-50" },
  ] : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-sora text-slate-900 mb-0.5">Admin Dashboard</h1>
        <p className="text-slate-500 text-sm">Operational overview.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? [1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5">
                <Skeleton className="size-9 rounded-xl mb-3" />
                <Skeleton className="h-6 w-20 mb-1" />
                <Skeleton className="h-3 w-28" />
              </div>
            ))
          : stats.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white rounded-2xl border border-slate-100 p-5">
                <div className={cn("size-9 rounded-xl flex items-center justify-center mb-3", color)}>
                  <Icon className="size-4" />
                </div>
                <p className="text-xl font-bold font-sora text-slate-900">{value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent transactions */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold font-sora text-slate-900 text-sm">Recent transactions</h2>
            <Link href="/admin/transactions" className="text-xs text-green-700 hover:underline font-medium">
              View all →
            </Link>
          </div>
          {loading ? (
            <div className="divide-y divide-slate-50">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : (data?.recent_transactions ?? []).length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">No transactions yet.</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {(data?.recent_transactions ?? []).map((tx) => {
                const statusCfg = STATUS_CONFIG[tx.status] ?? STATUS_CONFIG.PENDING
                return (
                  <Link
                    key={tx.id}
                    href={`/admin/transactions?search=${tx.paystack_reference}`}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {tx.recipient_name ?? "—"}{" "}
                        <span className="text-slate-400 font-normal text-xs">via {tx.user_email}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-400">{formatDate(tx.created_at)}</span>
                        <span className="text-xs text-slate-300">·</span>
                        <span className="text-xs text-slate-400">₦{tx.ngn_amount.toLocaleString("en-NG")}</span>
                      </div>
                    </div>
                    <span className={cn("inline-flex text-xs font-medium px-2 py-0.5 rounded-full", statusCfg.color)}>
                      {statusCfg.label}
                    </span>
                    <ChevronRight className="size-4 text-slate-300 flex-shrink-0" />
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Agent summary */}
        <div className="bg-white rounded-2xl border border-slate-100">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold font-sora text-slate-900 text-sm">Agent float status</h2>
          </div>
          {loading ? (
            <div className="p-5 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-2 w-full rounded" />
                </div>
              ))}
            </div>
          ) : (data?.agent_summary ?? []).length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">No agents yet.</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {(data?.agent_summary ?? []).map((agent) => {
                const pct = agent.balance_percentage
                const barColor = pct < 20 ? "text-red-600" : pct < 50 ? "text-amber-600" : "text-green-600"
                return (
                  <div key={agent.id} className="px-5 py-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {agent.user ? `${agent.user.first_name} ${agent.user.last_name}` : "Unknown"}
                        </p>
                        <p className="text-xs text-slate-400">{agent.city}</p>
                      </div>
                      <div className="text-right">
                        <p className={cn("text-xs font-semibold", barColor)}>{pct}%</p>
                        <span className={cn(
                          "inline-flex text-xs px-1.5 py-0.5 rounded-full",
                          agent.is_available ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                        )}>
                          {agent.is_available ? "Available" : "Unavailable"}
                        </span>
                      </div>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                    <p className="text-xs text-slate-400">
                      ₦{agent.cash_balance.toLocaleString("en-NG")} / ₦{agent.max_balance.toLocaleString("en-NG")}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Status + currency breakdown */}
      {!loading && data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <h2 className="font-semibold text-slate-900 text-sm mb-4">By status (all time)</h2>
            <div className="space-y-2">
              {Object.entries(data.transactions_by_status).map(([status, count]) => {
                const cfg = STATUS_CONFIG[status] ?? { color: "bg-slate-100 text-slate-600", label: status }
                return (
                  <div key={status} className="flex items-center justify-between">
                    <span className={cn("inline-flex text-xs font-medium px-2 py-0.5 rounded-full", cfg.color)}>
                      {cfg.label}
                    </span>
                    <span className="text-sm font-semibold text-slate-800">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <h2 className="font-semibold text-slate-900 text-sm mb-4">By currency (last 30 days)</h2>
            <div className="space-y-2">
              {Object.entries(data.transactions_by_currency).map(([currency, count]) => (
                <div key={currency} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 font-medium">{currency}</span>
                  <span className="text-sm font-semibold text-slate-800">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
