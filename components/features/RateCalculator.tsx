"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/auth"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import apiClient from "@/lib/api"
import type { Rate } from "@/types/rate"

const CURRENCIES = [
  { code: "USD", label: "🇺🇸 USD · US Dollar" },
  { code: "CAD", label: "🇨🇦 CAD · Canadian Dollar" },
  { code: "GBP", label: "🇬🇧 GBP · British Pound" },
  { code: "EUR", label: "🇪🇺 EUR · Euro" },
  { code: "TRY", label: "🇹🇷 TRY · Turkish Lira" },
  { code: "AUD", label: "🇦🇺 AUD · Australian Dollar" },
  { code: "GHS", label: "🇬🇭 GHS · Ghanaian Cedi" },
  { code: "ZAR", label: "🇿🇦 ZAR · South African Rand" },
]

function formatNGN(value: string): string {
  const digits = value.replace(/\D/g, "")
  if (!digits) return ""
  return Number(digits).toLocaleString("en-NG")
}

function parseNGN(formatted: string): number {
  return Number(formatted.replace(/,/g, "")) || 0
}

export function RateCalculator({ dark = false }: { dark?: boolean }) {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()

  const [ngnInput, setNgnInput] = useState("100,000")
  const [currency, setCurrency] = useState("USD")
  const [rate, setRate] = useState<Rate | null>(null)
  const [loading, setLoading] = useState(true)
  const [stale, setStale] = useState(false)

  const fetchRate = useCallback(async (cur: string) => {
    try {
      setStale(false)
      const res = await apiClient.get<Rate>(`/rates/${cur}`)
      setRate(res.data)
    } catch {
      setStale(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchRate(currency)
    const id = setInterval(() => fetchRate(currency), 60_000)
    return () => clearInterval(id)
  }, [currency, fetchRate])

  function handleNgnChange(e: React.ChangeEvent<HTMLInputElement>) {
    setNgnInput(formatNGN(e.target.value))
  }

  const ngnAmount = parseNGN(ngnInput)
  const converted = rate && ngnAmount > 0 ? (ngnAmount / rate.our_rate).toFixed(2) : null
  const fee = ngnAmount > 0 ? Math.min(Math.max(ngnAmount * 0.01, 500), 5000).toLocaleString("en-NG", { maximumFractionDigits: 0 }) : null
  const currencyMeta = CURRENCIES.find(c => c.code === currency)

  function handleSend() {
    if (!isAuthenticated) {
      sessionStorage.setItem(
        "nairaflow_pending_transfer",
        JSON.stringify({ amount: ngnAmount, currency })
      )
      router.push("/login")
    } else {
      router.push("/send")
    }
  }

  const labelCls = cn("text-xs font-medium mb-1", dark ? "text-muted-dark" : "text-muted-text")
  const inputCls = cn(
    "w-full rounded-lg border px-3 py-2.5 text-sm font-medium outline-none transition-colors",
    dark
      ? "bg-ink border-ink-line text-bone placeholder:text-muted-dark focus:border-emerald"
      : "bg-bone border-bone-deep text-ink placeholder:text-muted-text focus:border-emerald"
  )
  const cardCls = cn(
    "rounded-xl p-5",
    dark ? "bg-ink-soft border border-ink-line shadow-md" : "bg-paper border-2 border-ink shadow-sm"
  )

  return (
    <div className={cardCls}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* NGN input */}
        <div>
          <p className={labelCls}>You send (NGN ₦)</p>
          <input
            type="text"
            inputMode="numeric"
            value={ngnInput}
            onChange={handleNgnChange}
            placeholder="0"
            className={inputCls}
          />
        </div>

        {/* Currency selector */}
        <div>
          <p className={labelCls}>Recipient gets</p>
          <Select value={currency} onValueChange={(v) => v && setCurrency(v)}>
            <SelectTrigger
              className={cn(
                "w-full rounded-lg border px-3 py-2.5 text-sm font-medium h-auto",
                dark
                  ? "bg-ink border-ink-line text-bone hover:bg-ink-soft"
                  : "bg-bone border-bone-deep text-ink"
              )}
            >
              <SelectValue>{currencyMeta?.label}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map(({ code, label }) => (
                <SelectItem key={code} value={code}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Result */}
      <div className={cn("rounded-xl p-4 mb-4", dark ? "bg-ink" : "bg-emerald/10")}>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-7 w-32" />
          </div>
        ) : stale ? (
          <p className="text-amber text-sm font-medium">Rate may be outdated. Check back shortly.</p>
        ) : (
          <>
            <p className={cn("text-xs mb-0.5", dark ? "text-muted-dark" : "text-muted-text")}>
              Recipient gets
            </p>
            <p className={cn("text-2xl font-bold font-display", dark ? "text-bone" : "text-ink")}>
              {converted ? `${rate?.symbol}${converted}` : `${rate?.symbol ?? ""}0.00`}{" "}
              <span className={cn("text-base font-medium", dark ? "text-muted-dark" : "text-muted-text")}>
                {currency}
              </span>
            </p>
            {rate && (
              <p className={cn("text-xs mt-1", dark ? "text-muted-dark" : "text-muted-text")}>
                Rate: ₦{rate.our_rate.toLocaleString("en-NG")} / {currency}
              </p>
            )}
          </>
        )}
      </div>

      {/* Fee */}
      {fee && !loading && !stale && (
        <p className={cn("text-xs mb-4", dark ? "text-muted-dark" : "text-muted-text")}>
          Transfer fee: <span className="font-medium">₦{fee}</span> · Includes all charges
        </p>
      )}

      <button
        onClick={handleSend}
        className="w-full bg-emerald hover:bg-emerald-deep text-bone font-semibold text-sm py-3 rounded-xl transition-colors border-2 border-ink"
      >
        Send money →
      </button>
    </div>
  )
}
