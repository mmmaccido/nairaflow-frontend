"use client"

import { useState, useEffect, useCallback } from "react"
import { RefreshCw, Pencil, Check, X, AlertTriangle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import apiClient from "@/lib/api"
import { handleApiError } from "@/lib/handleApiError"
import { ErrorAlert } from "@/components/shared/ErrorAlert"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminRate {
  currency: string
  name: string
  symbol: string
  market_rate: number
  our_rate: number
  spread_percent: number
  payout: string
  recorded_at: string
  is_cached: boolean
  cache_age_seconds: number | null
}

interface RefreshResult {
  stale: boolean
  rates: Record<string, AdminRate>
}

// ─── Inline edit row ──────────────────────────────────────────────────────────

function RateRow({ rate, onUpdated }: { rate: AdminRate; onUpdated: (updated: AdminRate) => void }) {
  const [editing, setEditing] = useState(false)
  const [spreadVal, setSpreadVal] = useState(String(rate.spread_percent))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function saveSpread() {
    const num = parseFloat(spreadVal)
    if (isNaN(num) || num < 0.1 || num > 10) {
      setError("Spread must be between 0.1 and 10")
      return
    }
    setSaving(true)
    setError("")
    try {
      const res = await apiClient.put<{ currency: string; market_rate: number; our_rate: number; spread_percent: number }>(
        `/admin/rates/${rate.currency}`,
        { spread_percent: num }
      )
      toast.success(`${rate.currency} spread updated to ${num}%`)
      onUpdated({ ...rate, spread_percent: res.data.spread_percent, our_rate: res.data.our_rate })
      setEditing(false)
    } catch (err) {
      setError(handleApiError(err))
    } finally {
      setSaving(false)
    }
  }

  function cancel() {
    setSpreadVal(String(rate.spread_percent))
    setError("")
    setEditing(false)
  }

  const age = rate.cache_age_seconds !== null
    ? rate.cache_age_seconds < 60
      ? `${rate.cache_age_seconds}s ago`
      : `${Math.round(rate.cache_age_seconds / 60)}m ago`
    : null

  return (
    <tr className="hover:bg-bone transition-colors">
      <td className="px-4 py-3">
        <p className="text-sm font-semibold text-ink">{rate.currency}</p>
        <p className="text-xs text-muted-text">{rate.name}</p>
      </td>
      <td className="px-4 py-3 text-sm text-ink-soft font-mono">
        ₦{rate.market_rate.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </td>
      <td className="px-4 py-3 text-sm font-semibold text-ink font-mono">
        ₦{rate.our_rate.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </td>
      <td className="px-4 py-3">
        {editing ? (
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              step="0.1"
              min="0.1"
              max="10"
              value={spreadVal}
              onChange={(e) => setSpreadVal(e.target.value)}
              className="w-20 h-7 text-xs px-2"
              autoFocus
            />
            <span className="text-xs text-muted-text">%</span>
            <button onClick={saveSpread} disabled={saving} className="text-emerald hover:text-emerald-deep p-0.5">
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            </button>
            <button onClick={cancel} className="text-muted-text hover:text-ink p-0.5">
              <X className="size-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-ink-soft">{rate.spread_percent}%</span>
            <button onClick={() => setEditing(true)} className="text-muted-text hover:text-ink transition-colors">
              <Pencil className="size-3.5" />
            </button>
          </div>
        )}
        {error && <p className="text-xs text-clay mt-0.5">{error}</p>}
      </td>
      <td className="px-4 py-3 text-xs text-muted-text">{rate.payout}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <div className={cn("size-2 rounded-full", rate.is_cached ? "bg-emerald" : "bg-bone-deep")} />
          <span className="text-xs text-muted-text">
            {rate.is_cached ? `Cached ${age ?? ""}` : "Not cached"}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-muted-text">
        {rate.recorded_at ? new Date(rate.recorded_at).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
      </td>
    </tr>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AdminRatesPage() {
  const [rates, setRates]     = useState<AdminRate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [stale, setStale]     = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const loadRates = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await apiClient.get<AdminRate[]>("/admin/rates")
      setRates(r.data)
    } catch (err) {
      setError(handleApiError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadRates() }, [loadRates])

  async function forceRefresh() {
    setRefreshing(true)
    try {
      const res = await apiClient.post<RefreshResult>("/admin/rates/refresh")
      if (res.data.stale) {
        setStale(true)
        toast.error("Rate API unreachable. Showing last known rates.")
      } else {
        setStale(false)
        toast.success("Rates refreshed successfully")
        // Reload full rate list
        const fresh = await apiClient.get<AdminRate[]>("/admin/rates")
        setRates(fresh.data)
      }
    } catch (err) {
      toast.error(handleApiError(err))
    } finally {
      setRefreshing(false)
    }
  }

  function handleRateUpdated(updated: AdminRate) {
    setRates((prev) => prev.map((r) => r.currency === updated.currency ? updated : r))
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-ink mb-0.5">Exchange Rates</h1>
          <p className="text-muted-text text-sm">Manage spreads and force rate refreshes.</p>
        </div>
        <button
          onClick={forceRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 bg-ink hover:bg-ink-soft text-bone text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60 border-2 border-ink shadow-sm"
        >
          {refreshing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Force refresh
        </button>
      </div>

      {/* Stale warning */}
      {stale && (
        <div className="flex items-start gap-3 bg-amber/10 border border-amber/30 rounded-xl px-4 py-3">
          <AlertTriangle className="size-5 text-amber flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-ink">Rates are stale</p>
            <p className="text-xs text-amber mt-0.5">
              The exchange rate API is unreachable. Showing last known rates from the database.
            </p>
          </div>
        </div>
      )}

      {error && !loading && <ErrorAlert message={error} onRetry={loadRates} />}

      {/* Rates table */}
      <div className="bg-paper rounded-xl border-2 border-ink shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bone border-b border-bone-deep">
                {["Currency", "Market rate", "Our rate", "Spread", "Provider", "Cache", "Last updated"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-text whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-bone">
              {loading ? (
                [1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <tr key={i}>
                    {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : (
                rates.map((rate) => (
                  <RateRow key={rate.currency} rate={rate} onUpdated={handleRateUpdated} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-text">
        Rates auto-refresh every 5 minutes via the scheduler. Spread changes take effect on the next scheduled or forced refresh.
      </p>
    </div>
  )
}
