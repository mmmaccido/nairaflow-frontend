"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, Check, X, Download, Globe, Building2, Truck, Smartphone, ArrowRightLeft, Loader2 } from "lucide-react"
import { toast } from "sonner"
import apiClient from "@/lib/api"
import { handleApiError } from "@/lib/handleApiError"
import { ErrorAlert } from "@/components/shared/ErrorAlert"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { Transaction } from "@/types/transaction"

const COUNTRY_FLAGS: Record<string, string> = {
  US: "🇺🇸", CA: "🇨🇦", GB: "🇬🇧", DE: "🇩🇪", FR: "🇫🇷",
  NL: "🇳🇱", BE: "🇧🇪", ES: "🇪🇸", IT: "🇮🇹", AT: "🇦🇹",
  PT: "🇵🇹", CH: "🇨🇭", TR: "🇹🇷", AU: "🇦🇺", GH: "🇬🇭",
  ZA: "🇿🇦", NG: "🇳🇬",
}

const DELIVERY_LABELS: Record<string, string> = {
  BANK_WIRE:         "International Bank Wire",
  BANK_TRANSFER_NGN: "NGN Bank Transfer",
  CASH_PICKUP:       "Cash Delivery",
  MOBILE_MONEY:      "Mobile Money",
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  COMPLETED:  { color: "bg-emerald/10 text-emerald",     label: "Completed"  },
  PROCESSING: { color: "bg-amber/15 text-amber",         label: "Processing" },
  PAID:       { color: "bg-emerald/10 text-emerald",     label: "Paid"       },
  PENDING:    { color: "bg-bone-deep text-muted-text",   label: "Pending"    },
  FAILED:     { color: "bg-clay/10 text-clay",           label: "Failed"     },
  REFUNDED:   { color: "bg-sage/20 text-emerald-light",  label: "Refunded"   },
}

const TIMELINE = ["Initiated", "Payment Received", "Processing", "Completed"]

function getTimelineState(status: string, stepIdx: number): "done" | "active" | "failed" | "pending" {
  const doneThrough: Record<string, number> = {
    PENDING: 0, PAID: 1, PROCESSING: 2, COMPLETED: 3, REFUNDED: 3, FAILED: 1,
  }
  const done = doneThrough[status] ?? 0
  if (status === "FAILED" && stepIdx === done + 1) return "failed"
  if (stepIdx <= done) return "done"
  if (stepIdx === done + 1 && status !== "FAILED") return "active"
  return "pending"
}

function finalStepLabel(status: string) {
  if (status === "FAILED")    return "Failed"
  if (status === "REFUNDED")  return "Refunded"
  return "Completed"
}

function maskValue(val: string): string {
  if (!val || val.length <= 4) return "****"
  return "****" + val.slice(-4)
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-NG", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  })
}

function DeliveryIcon({ type, className }: { type: string; className?: string }) {
  const map: Record<string, React.ReactNode> = {
    BANK_WIRE:         <Globe      className={className} />,
    BANK_TRANSFER_NGN: <Building2  className={className} />,
    CASH_PICKUP:       <Truck      className={className} />,
    MOBILE_MONEY:      <Smartphone className={className} />,
  }
  return <>{map[type] ?? <ArrowRightLeft className={className} />}</>
}

export default function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [tx, setTx]                     = useState<Transaction | null>(null)
  const [loading, setLoading]           = useState(true)
  const [notFound, setNotFound]         = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [downloading, setDownloading]   = useState(false)

  async function downloadReceipt() {
    if (!tx) return
    setDownloading(true)
    try {
      const res = await apiClient.get(`/transactions/${tx.id}/receipt`, {
        responseType: "blob",
      })
      const url  = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }))
      const link = document.createElement("a")
      link.href  = url
      link.download = `NairaFlow-Receipt-${tx.paystack_reference}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 422) {
        toast.error("Receipt is only available for completed transactions.")
      } else {
        toast.error("Failed to download receipt. Please try again.")
      }
    } finally {
      setDownloading(false)
    }
  }

  const loadTransaction = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const r = await apiClient.get<Transaction>(`/transactions/${id}`)
      setTx(r.data)
    } catch (e) {
      if ((e as { response?: { status?: number } })?.response?.status === 404) {
        setNotFound(true)
      } else {
        setError(handleApiError(e))
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadTransaction() }, [loadTransaction])

  if (loading) {
    return (
      <div className="max-w-2xl space-y-5">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl space-y-5">
        <Link href="/transactions" className="flex items-center gap-1.5 text-sm text-muted-text hover:text-ink transition-colors">
          <ArrowLeft className="size-4" /> Back
        </Link>
        <ErrorAlert message={error} onRetry={loadTransaction} />
      </div>
    )
  }

  if (notFound || !tx) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-text text-sm mb-4">Transaction not found.</p>
        <Link href="/transactions" className="text-emerald hover:underline text-sm font-medium">
          ← Back to transactions
        </Link>
      </div>
    )
  }

  const statusCfg = STATUS_CONFIG[tx.status] ?? STATUS_CONFIG.PENDING
  const steps = [...TIMELINE.slice(0, 3), finalStepLabel(tx.status)]

  return (
    <div className="max-w-2xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/transactions" className="flex items-center gap-1.5 text-sm text-muted-text hover:text-ink transition-colors">
          <ArrowLeft className="size-4" /> Back
        </Link>
        <span className={cn("inline-flex text-xs font-medium px-2.5 py-1 rounded-full", statusCfg.color)}>
          {statusCfg.label}
        </span>
      </div>

      <div>
        <h1 className="text-2xl font-bold font-display text-ink mb-0.5">Transfer details</h1>
        <p className="text-xs text-muted-text">Ref: {tx.paystack_reference}</p>
      </div>

      {/* Status timeline */}
      <div className="bg-paper rounded-xl border-2 border-ink shadow-sm p-5">
        <h2 className="text-sm font-semibold text-ink-soft mb-5">Transfer progress</h2>
        <div className="flex items-start gap-0">
          {steps.map((label, i) => {
            const state = getTimelineState(tx.status, i)
            const isLast = i === steps.length - 1
            return (
              <div key={i} className="flex flex-col items-center flex-1">
                <div className="flex items-center w-full">
                  {/* Circle */}
                  <div
                    className={cn(
                      "size-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all",
                      state === "done"   ? "bg-emerald border-emerald text-bone" :
                      state === "active" ? "bg-emerald border-emerald text-bone" :
                      state === "failed" ? "bg-clay border-clay text-bone" :
                      "bg-paper border-bone-deep text-muted-text"
                    )}
                  >
                    {state === "done"   ? <Check className="size-4 stroke-[2.5]" /> :
                     state === "failed" ? <X     className="size-4 stroke-[2.5]" /> :
                     <span className="text-xs font-bold">{i + 1}</span>}
                  </div>
                  {/* Connector line */}
                  {!isLast && (
                    <div className={cn(
                      "flex-1 h-0.5 mx-1",
                      i < ({"PENDING":0,"PAID":1,"PROCESSING":2,"COMPLETED":3,"REFUNDED":3,"FAILED":1}[tx.status] ?? 0)
                        ? "bg-emerald" : "bg-bone-deep"
                    )} />
                  )}
                </div>
                {/* Label + timestamp */}
                <div className="mt-2 text-center px-0.5">
                  <p className={cn(
                    "text-xs font-medium",
                    state === "done" || state === "active" ? "text-ink" :
                    state === "failed" ? "text-clay" : "text-muted-text"
                  )}>
                    {label}
                  </p>
                  {i === 0 && (
                    <p className="text-xs text-muted-text mt-0.5">{formatDateTime(tx.created_at)}</p>
                  )}
                  {i === steps.length - 1 && (state === "done" || state === "failed") && (
                    <p className="text-xs text-muted-text mt-0.5">{formatDateTime(tx.updated_at)}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-paper rounded-xl border-2 border-ink shadow-sm p-5 space-y-3">
        <h2 className="text-sm font-semibold text-ink-soft mb-4">Summary</h2>
        <div className="flex justify-between text-sm">
          <span className="text-muted-text">You sent</span>
          <span className="font-semibold text-ink">₦{Number(tx.ngn_amount).toLocaleString("en-NG")}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-text">Recipient gets</span>
          <span className="font-semibold text-emerald">{Number(tx.target_amount).toFixed(2)} {tx.target_currency}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-text">Fee</span>
          <span className="text-ink-soft">₦{Number(tx.fee).toLocaleString("en-NG")}</span>
        </div>
        <div className="flex justify-between text-sm border-t border-bone-deep pt-3">
          <span className="text-muted-text font-medium">Total deducted</span>
          <span className="font-bold text-ink">₦{(Number(tx.ngn_amount) + Number(tx.fee)).toLocaleString("en-NG")}</span>
        </div>
        <div className="flex justify-between text-sm pt-1">
          <span className="text-muted-text">Rate used</span>
          <span className="text-ink-soft">₦{Number(tx.rate_ngn_to_target).toLocaleString("en-NG")} / {tx.target_currency}</span>
        </div>
        <div className="flex justify-between text-sm items-center">
          <span className="text-muted-text">Delivery method</span>
          <span className="flex items-center gap-1.5 text-ink-soft">
            <DeliveryIcon type={tx.delivery_type} className="size-3.5 text-muted-text" />
            {DELIVERY_LABELS[tx.delivery_type] ?? tx.delivery_type}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-text">Date</span>
          <span className="text-ink-soft">{formatDateTime(tx.created_at)}</span>
        </div>
      </div>

      {/* Recipient details */}
      {tx.recipient && (
        <div className="bg-paper rounded-xl border-2 border-ink shadow-sm p-5">
          <h2 className="text-sm font-semibold text-ink-soft mb-4">Recipient</h2>
          <div className="flex items-center gap-3 mb-4">
            <div className="size-10 rounded-full bg-bone-deep flex items-center justify-center text-lg">
              {COUNTRY_FLAGS[tx.recipient.country_code] ?? "🌍"}
            </div>
            <div>
              <p className="font-semibold text-ink">{tx.recipient.first_name} {tx.recipient.last_name}</p>
              <p className="text-xs text-muted-text">{tx.recipient.country_code} · {tx.recipient.currency}</p>
            </div>
          </div>
          <div className="space-y-1.5">
            {Object.entries(tx.recipient.bank_details)
              .filter(([, v]) => !!v)
              .map(([key, val]) => {
                const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())
                const masked = ["accountNumber", "iban", "mobileNumber"].includes(key)
                  ? maskValue(String(val))
                  : String(val)
                return (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-muted-text">{label}</span>
                    <span className="font-mono text-ink-soft">{masked}</span>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Agent info (cash delivery) */}
      {tx.delivery_type === "CASH_PICKUP" && tx.agent && (
        <div className="bg-paper rounded-xl border-2 border-ink shadow-sm p-5">
          <h2 className="text-sm font-semibold text-ink-soft mb-3">Cash delivery agent</h2>
          <div className="space-y-1.5 text-sm">
            {tx.agent.user && (
              <div className="flex justify-between">
                <span className="text-muted-text">Agent name</span>
                <span className="text-ink-soft">{tx.agent.user.first_name} {tx.agent.user.last_name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-text">City</span>
              <span className="text-ink-soft">{tx.agent.city}</span>
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      {tx.notes && (
        <div className="bg-amber/10 border border-amber/30 rounded-xl px-4 py-3">
          <p className="text-xs font-medium text-amber mb-1">Note</p>
          <p className="text-sm text-ink">{tx.notes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pb-6">
        <Link
          href="/transactions"
          className="flex-1 text-center border border-bone-deep text-ink-soft hover:bg-bone font-semibold text-sm py-2.5 rounded-xl transition-colors"
        >
          ← Back
        </Link>
        <button
          onClick={downloadReceipt}
          disabled={downloading}
          className="flex items-center justify-center gap-2 flex-1 bg-bone-deep hover:bg-bone text-ink font-semibold text-sm py-2.5 rounded-xl transition-colors disabled:opacity-60 border border-bone-deep"
        >
          {downloading
            ? <Loader2 className="size-4 animate-spin" />
            : <Download className="size-4" />}
          Download receipt
        </button>
      </div>
    </div>
  )
}
