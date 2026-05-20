"use client"

import { useState, useEffect } from "react"
import { RefreshCw, Pencil, Check, X, AlertTriangle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import apiClient from "@/lib/api"
import { handleApiError } from "@/lib/handleApiError"
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
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">{rate.currency}</p>
        <p className="text-xs text-slate-400">{rate.name}</p>
      </td>
      <td className="px-4 py-3 text-sm text-slate-700 font-mono">
        ₦{rate.market_rate.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </td>
      <td className="px-4 py-3 text-sm font-semibold text-slate-900 font-mono">
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
            <span className="text-xs text-slate-400">%</span>
            <button onClick={saveSpread} disabled={saving} className="text-green-600 hover:text-green-700 p-0.5">
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            </button>
            <button onClick={cancel} className="text-slate-400 hover:text-slate-600 p-0.5">
              <X className="size-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-700">{rate.spread_percent}%</span>
            <button onClick={() => setEditing(true)} className="text-slate-400 hover:text-slate-700 transition-colors">
              <Pencil className="size-3.5" />
            </button>
          </div>
        )}
        {error && <p className="text-xs text-red-600 mt-0.5">{error}</p>}
      </td>
      <td className="px-4 py-3 text-xs text-slate-500">{rate.payout}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <div className={cn("size-2 rounded-full", rate.is_cached ? "bg-green-500" : "bg-slate-300")} />
          <span className="text-xs text-slate-500">
            {rate.is_cached ? `Cached ${age ?? ""}` : "Not cached"}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-slate-400">
        {rate.recorded_at ? new Date(rate.recorded_at).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
      </td>
    </tr>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AdminRatesPage() {
  const [rates, setRates]     = useState<AdminRate[]>([])
  const [loading, setLoading] = useState(true)
  const [stale, setStale]     = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    apiClient
      .get<AdminRate[]>("/admin/rates")
      .then((r) => setRates(r.data))
      .finally(() => setLoading(false))
  }, [])

  async function forceRefresh() {
    setRefreshing(true)
    try {
      const res = await apiClient.post<RefreshResult>("/admin/rates/refresh")
      if (res.data.stale) {
        setStale(true)
        toast("Rates are stale — API unreachable, showing last known rates.")
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
          <h1 className="text-2xl font-bold font-sora text-slate-900 mb-0.5">Exchange Rates</h1>
          <p className="text-slate-500 text-sm">Manage spreads and force rate refreshes.</p>
        </div>
        <button
          onClick={forceRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60"
        >
          {refreshing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Force refresh
        </button>
      </div>

      {/* Stale warning */}
      {stale && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle className="size-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Rates are stale</p>
            <p className="text-xs text-amber-600 mt-0.5">
              The exchange rate API is unreachable. Showing last known rates from the database.
            </p>
          </div>
        </div>
      )}

      {/* Rates table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Currency", "Market rate", "Our rate", "Spread", "Provider", "Cache", "Last updated"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
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

      <p className="text-xs text-slate-400">
        Rates auto-refresh every 5 minutes via the scheduler. Spread changes take effect on the next scheduled or forced refresh.
      </p>
    </div>
  )
}
