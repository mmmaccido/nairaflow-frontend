"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Globe, Building2, Truck, Smartphone, ArrowRightLeft } from "lucide-react"
import apiClient from "@/lib/api"
import { handleApiError } from "@/lib/handleApiError"
import { ErrorAlert } from "@/components/shared/ErrorAlert"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { Transaction } from "@/types/transaction"

interface Paginated<T> {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  COMPLETED:  { color: "bg-emerald/10 text-emerald",     label: "Completed"  },
  PROCESSING: { color: "bg-amber/15 text-amber",         label: "Processing" },
  PAID:       { color: "bg-emerald/10 text-emerald",     label: "Paid"       },
  PENDING:    { color: "bg-bone-deep text-muted-text",   label: "Pending"    },
  FAILED:     { color: "bg-clay/10 text-clay",           label: "Failed"     },
  REFUNDED:   { color: "bg-sage/20 text-emerald-light",  label: "Refunded"   },
}

const CURRENCIES = ["USD", "CAD", "GBP", "EUR", "TRY", "AUD", "GHS", "ZAR", "NGN"]

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { color: "bg-bone-deep text-muted-text", label: status }
  return (
    <span className={cn("inline-flex text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap", cfg.color)}>
      {cfg.label}
    </span>
  )
}

function DeliveryIcon({ type }: { type: string }) {
  const map: Record<string, React.ReactNode> = {
    BANK_WIRE:         <Globe      className="size-4 text-muted-text" />,
    BANK_TRANSFER_NGN: <Building2  className="size-4 text-muted-text" />,
    CASH_PICKUP:       <Truck      className="size-4 text-muted-text" />,
    MOBILE_MONEY:      <Smartphone className="size-4 text-muted-text" />,
  }
  return <>{map[type] ?? <ArrowRightLeft className="size-4 text-muted-text" />}</>
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })
}

export default function TransactionsPage() {
  const [data, setData]         = useState<Paginated<Transaction> | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [page, setPage]         = useState(1)
  const [status, setStatus]     = useState("")
  const [currency, setCurrency] = useState("")
  const [search, setSearch]     = useState("")

  const fetch = useCallback(async (p: number, s: string, c: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ per_page: "20", page: String(p) })
      if (s) params.set("status", s)
      if (c) params.set("target_currency", c)
      const res = await apiClient.get<Paginated<Transaction>>(`/transactions?${params}`)
      setData(res.data)
    } catch (err) {
      setError(handleApiError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch(page, status, currency)
  }, [page, status, currency, fetch])

  const rows = (data?.data ?? []).filter((tx) => {
    if (!search) return true
    const name = tx.recipient ? `${tx.recipient.first_name} ${tx.recipient.last_name}`.toLowerCase() : ""
    return name.includes(search.toLowerCase())
  })

  function onStatusChange(val: string) { setStatus(val); setPage(1) }
  function onCurrencyChange(val: string) { setCurrency(val); setPage(1) }

  const selectCls = "rounded-lg border border-bone-deep px-3 py-2 text-sm bg-paper text-ink-soft outline-none focus:border-emerald transition-colors"

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold font-display text-ink mb-0.5">Transactions</h1>
        <p className="text-muted-text text-sm">Your full transfer history.</p>
      </div>

      {error && !loading && <ErrorAlert message={error} onRetry={() => fetch(page, status, currency)} />}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search recipient…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={cn(selectCls, "flex-1 min-w-40")}
        />
        <select value={status} onChange={(e) => onStatusChange(e.target.value)} className={selectCls}>
          <option value="">All statuses</option>
          {Object.entries(STATUS_CONFIG).map(([val, { label }]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <select value={currency} onChange={(e) => onCurrencyChange(e.target.value)} className={selectCls}>
          <option value="">All currencies</option>
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-paper rounded-xl border-2 border-ink shadow-sm overflow-hidden">
        {/* Header */}
        <div className="hidden md:grid grid-cols-[1.5fr_1fr_1fr_1fr_1.5rem] gap-4 px-5 py-3 border-b border-bone-deep bg-bone">
          <p className="text-xs font-medium text-muted-text">Recipient</p>
          <p className="text-xs font-medium text-muted-text">Sent</p>
          <p className="text-xs font-medium text-muted-text">Received</p>
          <p className="text-xs font-medium text-muted-text">Status</p>
          <span />
        </div>

        {loading ? (
          <div className="divide-y divide-bone">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <Skeleton className="size-9 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-text text-sm mb-3">
              {search || status || currency ? "No transfers match your filters." : "No transfers yet."}
            </p>
            {!search && !status && !currency && (
              <Link href="/send" className="inline-block bg-emerald hover:bg-emerald-deep text-bone text-sm font-medium px-4 py-2 rounded-lg transition-colors border-2 border-ink">
                Send your first transfer
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-bone">
            {rows.map((tx) => {
              const name = tx.recipient ? `${tx.recipient.first_name} ${tx.recipient.last_name}` : "—"
              return (
                <Link key={tx.id} href={`/transactions/${tx.id}`} className="flex md:grid md:grid-cols-[1.5fr_1fr_1fr_1fr_1.5rem] items-center gap-4 px-5 py-3.5 hover:bg-bone transition-colors">
                  {/* Recipient */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-8 rounded-full bg-bone-deep flex items-center justify-center flex-shrink-0">
                      <DeliveryIcon type={tx.delivery_type} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{name}</p>
                      <p className="text-xs text-muted-text">{formatDate(tx.created_at)}</p>
                    </div>
                  </div>
                  {/* Sent */}
                  <p className="text-sm font-medium text-ink hidden md:block">
                    ₦{Number(tx.ngn_amount).toLocaleString("en-NG")}
                  </p>
                  {/* Received */}
                  <p className="text-sm text-ink-soft hidden md:block">
                    {Number(tx.target_amount).toFixed(2)} {tx.target_currency}
                  </p>
                  {/* Status */}
                  <div className="hidden md:flex items-center">
                    <StatusBadge status={tx.status} />
                  </div>
                  {/* Arrow */}
                  <ChevronRight className="size-4 text-muted-text flex-shrink-0 ml-auto" />
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.last_page > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-text">
            Page {data.current_page} of {data.last_page} · {data.total} total
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-bone-deep rounded-lg hover:bg-bone disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="size-3.5" /> Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(data.last_page, p + 1))}
              disabled={page === data.last_page}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-bone-deep rounded-lg hover:bg-bone disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}