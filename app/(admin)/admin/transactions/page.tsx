"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight, RefreshCw, Loader2 } from "lucide-react"
import { toast } from "sonner"
import apiClient from "@/lib/api"
import { handleApiError } from "@/lib/handleApiError"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

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
  notes: string | null
  created_at: string
  updated_at: string
}

interface Paginated<T> {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  COMPLETED:  { color: "bg-green-100 text-green-700",   label: "Completed"  },
  PROCESSING: { color: "bg-yellow-100 text-yellow-700", label: "Processing" },
  PAID:       { color: "bg-blue-100 text-blue-600",     label: "Paid"       },
  PENDING:    { color: "bg-slate-100 text-slate-600",   label: "Pending"    },
  FAILED:     { color: "bg-red-100 text-red-700",       label: "Failed"     },
  REFUNDED:   { color: "bg-purple-100 text-purple-700", label: "Refunded"   },
}

const DELIVERY_TYPES = ["BANK_WIRE", "BANK_TRANSFER_NGN", "CASH_PICKUP", "MOBILE_MONEY"]
const CURRENCIES = ["USD", "CAD", "GBP", "EUR", "TRY", "AUD", "GHS", "ZAR", "NGN"]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })
}

const selectCls = "rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white text-slate-700 outline-none focus:border-green-500 transition-colors"

// ─── Override dialog ──────────────────────────────────────────────────────────

function OverrideDialog({
  tx,
  onClose,
  onDone,
}: {
  tx: AdminTx
  onClose: () => void
  onDone: (updated: AdminTx) => void
}) {
  const [newStatus, setNewStatus] = useState<string>("")
  const [reason, setReason]       = useState("")
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState("")

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!newStatus || !reason.trim()) { setError("Both fields are required."); return }
    setSaving(true)
    setError("")
    try {
      const res = await apiClient.put<AdminTx>(`/admin/transactions/${tx.id}`, {
        status: newStatus,
        reason: reason.trim(),
      })
      toast.success("Status updated")
      onDone(res.data)
    } catch (err) {
      setError(handleApiError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Override transaction status</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-slate-500 font-mono mt-1">{tx.paystack_reference}</p>
        <form onSubmit={submit} className="space-y-4 mt-2">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
          <div>
            <Label className="mb-1.5 block text-sm font-medium">New status</Label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className={cn(selectCls, "w-full")}
            >
              <option value="">Select status…</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>
          <div>
            <Label className="mb-1.5 block text-sm font-medium">Reason</Label>
            <Input
              placeholder="Why is this being overridden?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-slate-800 hover:bg-slate-900 text-white" disabled={saving || !newStatus || !reason.trim()}>
              {saving && <Loader2 className="size-4 animate-spin mr-2" />}
              Override
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Inner page (uses useSearchParams) ───────────────────────────────────────

function AdminTransactionsInner() {
  const searchParams = useSearchParams()

  const [txs, setTxs]                 = useState<AdminTx[]>([])
  const [meta, setMeta]               = useState<{ current_page: number; last_page: number; total: number } | null>(null)
  const [loading, setLoading]         = useState(true)
  const [page, setPage]               = useState(1)

  // filters
  const [search, setSearch]           = useState(searchParams.get("search") ?? "")
  const [status, setStatus]           = useState("")
  const [currency, setCurrency]       = useState("")
  const [deliveryType, setDelivery]   = useState("")
  const [dateFrom, setDateFrom]       = useState("")
  const [dateTo, setDateTo]           = useState("")
  const [amountMin, setAmountMin]     = useState("")
  const [amountMax, setAmountMax]     = useState("")

  // dialogs
  const [overrideTarget, setOverrideTarget] = useState<AdminTx | null>(null)
  const [retrying, setRetrying]             = useState<string | null>(null)

  const fetchTxs = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ per_page: "25", page: String(p) })
      if (search)       params.set("search", search)
      if (status)       params.set("status", status)
      if (currency)     params.set("target_currency", currency)
      if (deliveryType) params.set("delivery_type", deliveryType)
      if (dateFrom)     params.set("date_from", dateFrom)
      if (dateTo)       params.set("date_to", dateTo)
      if (amountMin)    params.set("amount_min", amountMin)
      if (amountMax)    params.set("amount_max", amountMax)
      const res = await apiClient.get<Paginated<AdminTx>>(`/admin/transactions?${params}`)
      setTxs(res.data.data)
      setMeta({ current_page: res.data.current_page, last_page: res.data.last_page, total: res.data.total })
    } catch {
      setTxs([])
    } finally {
      setLoading(false)
    }
  }, [search, status, currency, deliveryType, dateFrom, dateTo, amountMin, amountMax])

  useEffect(() => { fetchTxs(page) }, [page, fetchTxs])

  function applyFilters() { setPage(1); fetchTxs(1) }

  async function retryPayout(tx: AdminTx) {
    setRetrying(tx.id)
    try {
      await apiClient.post(`/admin/transactions/${tx.id}/retry-payout`)
      toast.success("Payout retry dispatched")
      fetchTxs(page)
    } catch (err) {
      toast.error(handleApiError(err))
    } finally {
      setRetrying(null)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold font-sora text-slate-900 mb-0.5">Transactions</h1>
        <p className="text-slate-500 text-sm">{meta ? `${meta.total} total` : "Loading…"}</p>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Search email or reference…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(selectCls, "col-span-1 sm:col-span-2 lg:col-span-1")}
          />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls}>
            <option value="">All statuses</option>
            {Object.entries(STATUS_CONFIG).map(([v, { label }]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={selectCls}>
            <option value="">All currencies</option>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={deliveryType} onChange={(e) => setDelivery(e.target.value)} className={selectCls}>
            <option value="">All delivery types</option>
            {DELIVERY_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={selectCls} />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={selectCls} />
          <input
            type="number"
            placeholder="Min ₦"
            value={amountMin}
            onChange={(e) => setAmountMin(e.target.value)}
            className={selectCls}
          />
          <input
            type="number"
            placeholder="Max ₦"
            value={amountMax}
            onChange={(e) => setAmountMax(e.target.value)}
            className={selectCls}
          />
        </div>
        <Button onClick={applyFilters} className="bg-slate-800 hover:bg-slate-900 text-white text-sm">
          Apply filters
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["User", "Recipient", "Sent", "Received", "Status", "Ref", "Date", "Actions"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : txs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 text-sm">
                    No transactions match your filters.
                  </td>
                </tr>
              ) : (
                txs.map((tx) => {
                  const statusCfg = STATUS_CONFIG[tx.status] ?? STATUS_CONFIG.PENDING
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-xs text-slate-500 max-w-[140px] truncate">{tx.user_email}</td>
                      <td className="px-4 py-3 text-sm text-slate-800">{tx.recipient_name ?? "—"}</td>
                      <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                        ₦{tx.ngn_amount.toLocaleString("en-NG")}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {tx.target_amount.toFixed(2)} {tx.target_currency}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex text-xs font-medium px-2 py-0.5 rounded-full", statusCfg.color)}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{tx.paystack_reference.slice(0, 12)}…</td>
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{formatDate(tx.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setOverrideTarget(tx)}
                            className="text-xs font-medium text-slate-600 hover:text-slate-900 underline underline-offset-2"
                          >
                            Override
                          </button>
                          {tx.status === "FAILED" && (
                            <button
                              onClick={() => retryPayout(tx)}
                              disabled={retrying === tx.id}
                              className="flex items-center gap-1 text-xs font-medium text-green-700 hover:text-green-800"
                            >
                              {retrying === tx.id
                                ? <Loader2 className="size-3 animate-spin" />
                                : <RefreshCw className="size-3" />}
                              Retry
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">Page {meta.current_page} of {meta.last_page} · {meta.total} total</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="size-3.5" /> Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
              disabled={page === meta.last_page}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Override dialog */}
      {overrideTarget && (
        <OverrideDialog
          tx={overrideTarget}
          onClose={() => setOverrideTarget(null)}
          onDone={(updated) => {
            setTxs((prev) => prev.map((t) => t.id === updated.id ? { ...t, status: updated.status } : t))
            setOverrideTarget(null)
          }}
        />
      )}
    </div>
  )
}

export default function AdminTransactionsPage() {
  return (
    <Suspense fallback={<div className="p-6"><Skeleton className="h-8 w-48" /></div>}>
      <AdminTransactionsInner />
    </Suspense>
  )
}
