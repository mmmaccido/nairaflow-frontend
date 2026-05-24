"use client"

import { useState, useEffect } from "react"
import { Loader2, CheckCircle2, ShieldCheck, ShieldAlert, Shield } from "lucide-react"
import { toast } from "sonner"
import apiClient from "@/lib/api"
import { handleApiError } from "@/lib/handleApiError"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ErrorAlert } from "@/components/shared/ErrorAlert"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface KYCStatus {
  kyc_tier: 0 | 1 | 2
  kyc_status: string
  bvn_verified: boolean
  daily_limit: number
  remaining_today: number
}

const TIER_CONFIG: Record<number, { label: string; color: string; icon: React.ElementType }> = {
  0: { label: "Unverified",    color: "bg-bone-deep text-muted-text",   icon: Shield },
  1: { label: "BVN Verified",  color: "bg-emerald/10 text-emerald",    icon: ShieldCheck },
  2: { label: "Full KYC",      color: "bg-emerald/10 text-emerald",    icon: ShieldCheck },
}

const KYC_LIMITS: Record<number, string> = {
  0: "₦0",
  1: "₦1,000,000",
  2: "₦5,000,000",
}

const TIER_BENEFITS = [
  { label: "Daily limit",       t0: "₦0",      t1: "₦1,000,000", t2: "₦5,000,000" },
  { label: "Transfer access",   t0: "Blocked",  t1: "Enabled",    t2: "Enabled" },
  { label: "Bank wire",         t0: "No",       t1: "Yes",        t2: "Yes" },
  { label: "Cash delivery",     t0: "No",       t1: "Yes",        t2: "Yes" },
  { label: "Mobile money",      t0: "No",       t1: "Yes",        t2: "Yes" },
  { label: "Priority support",  t0: "No",       t1: "No",         t2: "Yes" },
]

function VerifyForm({
  idType,
  label,
  hint,
  onSuccess,
}: {
  idType: "bvn" | "nin"
  label: string
  hint: string
  onSuccess: () => void
}) {
  const [value, setValue]     = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState("")
  const [done, setDone]       = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (value.length !== 11) { setError("Must be exactly 11 digits"); return }
    setLoading(true)
    setError("")
    try {
      await apiClient.post(`/kyc/verify-${idType}`, { [idType]: value })
      setDone(true)
      toast.success(`${label} verified successfully!`)
      onSuccess()
    } catch (err) {
      setError(handleApiError(err))
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="flex items-center gap-3 text-emerald">
        <CheckCircle2 className="size-5" />
        <span className="text-sm font-medium">{label} verified! Your daily limit is now {idType === "bvn" ? "₦1,000,000" : "₦5,000,000"}.</span>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <Label className="mb-1.5 block text-sm font-medium text-ink-soft">
          {label} <span className="text-muted-text font-normal text-xs">(11 digits)</span>
        </Label>
        <p className="text-xs text-muted-text mb-2">{hint}</p>
        <Input
          type="text"
          inputMode="numeric"
          maxLength={11}
          placeholder="01234567890"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, "").slice(0, 11))}
        />
        {error && <p className="text-xs text-clay mt-1">{error}</p>}
      </div>
      <Button
        type="submit"
        disabled={loading || value.length !== 11}
        className="bg-emerald hover:bg-emerald-deep text-bone"
      >
        {loading ? (
          <><Loader2 className="size-4 animate-spin mr-2" />Verifying…</>
        ) : (
          `Verify ${label} →`
        )}
      </Button>
    </form>
  )
}

export default function KYCPage() {
  const [status, setStatus]   = useState<KYCStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  async function fetchStatus() {
    setError(null)
    try {
      const res = await apiClient.get<KYCStatus>("/kyc/status")
      setStatus(res.data)
    } catch (err) {
      setError(handleApiError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStatus() }, [])

  const tier = status?.kyc_tier ?? 0
  const tierCfg = TIER_CONFIG[tier]
  const TierIcon = tierCfg.icon

  const usedToday = status ? status.daily_limit - status.remaining_today : 0
  const pct       = status?.daily_limit ? Math.min(100, Math.round((usedToday / status.daily_limit) * 100)) : 0
  const barColor  = pct > 90 ? "bg-clay" : pct > 70 ? "bg-amber" : "bg-emerald"

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-ink mb-0.5">KYC Verification</h1>
        <p className="text-muted-text text-sm">Verify your identity to unlock transfers.</p>
      </div>

      {/* ── Tier status card ─────────────────────────────────────────────── */}
      <div className="bg-paper rounded-xl border-2 border-ink shadow-sm p-6 space-y-5">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-32 rounded-full" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-full rounded" />
          </div>
        ) : error ? (
          <ErrorAlert message={error} onRetry={fetchStatus} />
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className={cn("size-10 rounded-full flex items-center justify-center", tier === 0 ? "bg-bone-deep" : "bg-emerald/10")}>
                <TierIcon className={cn("size-5", tier === 0 ? "text-muted-text" : "text-emerald")} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={cn("inline-flex text-xs font-semibold px-2.5 py-1 rounded-full", tierCfg.color)}>
                    Tier {tier} — {tierCfg.label}
                  </span>
                </div>
                <p className="text-xs text-muted-text mt-0.5">
                  Daily limit: <span className="font-semibold text-ink-soft">{KYC_LIMITS[tier]}</span>
                </p>
              </div>
            </div>

            {tier > 0 && status && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-text">
                  <span>Used today</span>
                  <span>
                    ₦{usedToday.toLocaleString("en-NG")} of ₦{status.daily_limit.toLocaleString("en-NG")}
                  </span>
                </div>
                <div className="h-2 w-full bg-bone-deep rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", barColor)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {pct > 70 && (
                  <p className={cn("text-xs font-medium", pct > 90 ? "text-clay" : "text-amber")}>
                    {pct > 90
                      ? "You've used over 90% of your daily limit."
                      : "You're approaching your daily limit."}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── BVN verification ─────────────────────────────────────────────── */}
      {!loading && tier < 1 && (
        <div className="bg-paper rounded-xl border-2 border-ink shadow-sm p-6">
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="size-4 text-amber" />
            <h2 className="text-base font-semibold text-ink">Step 1: BVN Verification</h2>
          </div>
          <p className="text-sm text-muted-text mb-5">
            Link your Bank Verification Number to unlock transfers up to ₦1,000,000 per day.
          </p>
          <VerifyForm
            idType="bvn"
            label="BVN"
            hint="Your 11-digit Bank Verification Number issued by your Nigerian bank."
            onSuccess={fetchStatus}
          />
        </div>
      )}

      {/* ── NIN verification ─────────────────────────────────────────────── */}
      {!loading && tier === 1 && (
        <div className="bg-paper rounded-xl border-2 border-ink shadow-sm p-6">
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="size-4 text-emerald-light" />
            <h2 className="text-base font-semibold text-ink">Step 2: NIN Verification</h2>
          </div>
          <p className="text-sm text-muted-text mb-5">
            Provide your National Identification Number to upgrade to Full KYC and unlock up to ₦5,000,000 per day.
          </p>
          <VerifyForm
            idType="nin"
            label="NIN"
            hint="Your 11-digit National Identification Number from NIMC."
            onSuccess={fetchStatus}
          />
        </div>
      )}

      {/* ── Already fully verified ───────────────────────────────────────── */}
      {!loading && tier === 2 && (
        <div className="bg-emerald/10 border border-emerald/30 rounded-xl p-5 flex items-center gap-3">
          <CheckCircle2 className="size-5 text-emerald flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald">Full KYC complete</p>
            <p className="text-xs text-emerald/80 mt-0.5">You have full access with a ₦5,000,000 daily transfer limit.</p>
          </div>
        </div>
      )}

      {/* ── Tier benefits table ───────────────────────────────────────────── */}
      <div className="bg-paper rounded-xl border-2 border-ink shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-bone-deep">
          <h2 className="text-sm font-semibold text-ink">Tier comparison</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bone">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-text">Feature</th>
                {[0, 1, 2].map((t) => (
                  <th key={t} className="text-center px-4 py-3 text-xs font-medium text-muted-text">
                    <span className={cn(
                      "inline-flex px-2 py-0.5 rounded-full text-xs font-semibold",
                      t === tier ? TIER_CONFIG[t].color : "bg-bone-deep text-muted-text"
                    )}>
                      Tier {t}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-bone">
              {TIER_BENEFITS.map(({ label, t0, t1, t2 }) => (
                <tr key={label} className="hover:bg-bone">
                  <td className="px-5 py-3 text-ink-soft">{label}</td>
                  {[t0, t1, t2].map((val, i) => (
                    <td key={i} className={cn(
                      "px-4 py-3 text-center text-xs font-medium",
                      val === "No" || val === "Blocked" ? "text-muted-text" :
                      val === "Yes" || val === "Enabled" ? "text-emerald" : "text-ink"
                    )}>
                      {val}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}