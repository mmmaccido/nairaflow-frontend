"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, Check, X, Download, Globe, Building2, Truck, Smartphone, ArrowRightLeft, Loader2 } from "lucide-react"
import { toast } from "sonner"
import apiClient from "@/lib/api"
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
  COMPLETED:  { color: "bg-green-100 text-green-700",   label: "Completed"  },
  PROCESSING: { color: "bg-yellow-100 text-yellow-700", label: "Processing" },
  PAID:       { color: "bg-blue-100 text-blue-600",     label: "Paid"       },
  PENDING:    { color: "bg-slate-100 text-slate-600",   label: "Pending"    },
  FAILED:     { color: "bg-red-100 text-red-700",       label: "Failed"     },
  REFUNDED:   { color: "bg-purple-100 text-purple-700", label: "Refunded"   },
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

  useEffect(() => {
    if (!id) return
    apiClient
      .get<Transaction>(`/transactions/${id}`)
      .then((r) => setTx(r.data))
      .catch((e) => { if (e?.response?.status === 404) setNotFound(true) })
      .finally(() => setLoading(false))
  }, [id])

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

  if (notFound || !tx) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500 text-sm mb-4">Transaction not found.</p>
        <Link href="/transactions" className="text-green-700 hover:underline text-sm font-medium">
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
        <Link href="/transactions" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
          <ArrowLeft className="size-4" /> Back
        </Link>
        <span className={cn("inline-flex text-xs font-medium px-2.5 py-1 rounded-full", statusCfg.color)}>
          {statusCfg.label}
        </span>
      </div>

      <div>
        <h1 className="text-2xl font-bold font-sora text-slate-900 mb-0.5">Transfer details</h1>
        <p className="text-xs text-slate-400">Ref: {tx.paystack_reference}</p>
      </div>

      {/* Status timeline */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-5">Transfer progress</h2>
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
                      state === "done"   ? "bg-green-600 border-green-600 text-white" :
                      state === "active" ? "bg-green-600 border-green-600 text-white" :
                      state === "failed" ? "bg-red-500 border-red-500 text-white" :
                      "bg-white border-slate-300 text-slate-400"
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
                        ? "bg-green-600" : "bg-slate-200"
                    )} />
                  )}
                </div>
                {/* Label + timestamp */}
                <div className="mt-2 text-center px-0.5">
                  <p className={cn(
                    "text-xs font-medium",
                    state === "done" || state === "active" ? "text-slate-900" :
                    state === "failed" ? "text-red-600" : "text-slate-400"
                  )}>
                    {label}
                  </p>
                  {i === 0 && (
                    <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(tx.created_at)}</p>
                  )}
                  {i === steps.length - 1 && (state === "done" || state === "failed") && (
                    <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(tx.updated_at)}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Summary</h2>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">You sent</span>
          <span className="font-semibold text-slate-900">₦{tx.ngn_amount.toLocaleString("en-NG")}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Recipient gets</span>
          <span className="font-semibold text-green-700">{tx.target_amount.toFixed(2)} {tx.target_currency}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Fee</span>
          <span className="text-slate-700">₦{tx.fee.toLocaleString("en-NG")}</span>
        </div>
        <div className="flex justify-between text-sm border-t border-slate-100 pt-3">
          <span className="text-slate-500 font-medium">Total deducted</span>
          <span className="font-bold text-slate-900">₦{(tx.ngn_amount + tx.fee).toLocaleString("en-NG")}</span>
        </div>
        <div className="flex justify-between text-sm pt-1">
          <span className="text-slate-500">Rate used</span>
          <span className="text-slate-700">₦{tx.rate_ngn_to_target.toLocaleString("en-NG")} / {tx.target_currency}</span>
        </div>
        <div className="flex justify-between text-sm items-center">
          <span className="text-slate-500">Delivery method</span>
          <span className="flex items-center gap-1.5 text-slate-700">
            <DeliveryIcon type={tx.delivery_type} className="size-3.5 text-slate-400" />
            {DELIVERY_LABELS[tx.delivery_type] ?? tx.delivery_type}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Date</span>
          <span className="text-slate-700">{formatDateTime(tx.created_at)}</span>
        </div>
      </div>

      {/* Recipient details */}
      {tx.recipient && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Recipient</h2>
          <div className="flex items-center gap-3 mb-4">
            <div className="size-10 rounded-full bg-slate-100 flex items-center justify-center text-lg">
              {COUNTRY_FLAGS[tx.recipient.country_code] ?? "🌍"}
            </div>
            <div>
              <p className="font-semibold text-slate-900">{tx.recipient.first_name} {tx.recipient.last_name}</p>
              <p className="text-xs text-slate-500">{tx.recipient.country_code} · {tx.recipient.currency}</p>
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
                    <span className="text-slate-500">{label}</span>
                    <span className="font-mono text-slate-700">{masked}</span>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Agent info (cash delivery) */}
      {tx.delivery_type === "CASH_PICKUP" && tx.agent && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Cash delivery agent</h2>
          <div className="space-y-1.5 text-sm">
            {tx.agent.user && (
              <div className="flex justify-between">
                <span className="text-slate-500">Agent name</span>
                <span className="text-slate-700">{tx.agent.user.first_name} {tx.agent.user.last_name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">City</span>
              <span className="text-slate-700">{tx.agent.city}</span>
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      {tx.notes && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <p className="text-xs font-medium text-amber-700 mb-1">Note</p>
          <p className="text-sm text-amber-800">{tx.notes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pb-6">
        <Link
          href="/transactions"
          className="flex-1 text-center border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-sm py-2.5 rounded-xl transition-colors"
        >
          ← Back
        </Link>
        <button
          onClick={downloadReceipt}
          disabled={downloading}
          className="flex items-center justify-center gap-2 flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm py-2.5 rounded-xl transition-colors disabled:opacity-60"
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
