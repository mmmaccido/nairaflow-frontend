"use client"

import React, { useState, useEffect, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { toast } from "sonner"
import apiClient from "@/lib/api"
import { handleApiError } from "@/lib/handleApiError"
import { ErrorAlert } from "@/components/shared/ErrorAlert"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ─── Types ────────────────────────────────────────────────────────────────────

type KYCStatus = "PENDING" | "VERIFIED" | "FAILED"
type IDType    = "BVN" | "NIN" | "MANUAL_OVERRIDE"

interface KYCRecord {
  id: string
  user_id: string
  user_email: string
  id_type: IDType
  status: KYCStatus
  verified_at: string | null
  created_at: string
}

interface KYCListResponse {
  data: KYCRecord[]
  current_page: number
  last_page: number
  total: number
}

interface KYCHistoryRecord {
  id: string
  id_type: IDType
  status: KYCStatus
  verified_at: string | null
  created_at: string
  admin_note?: string | null
}

interface KYCUserHistory {
  user_id: string
  user_email: string
  email_verified: boolean
  kyc_tier: number
  kyc_status: string
  records: KYCHistoryRecord[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function StatusBadge({ status }: { status: KYCStatus }) {
  const styles: Record<KYCStatus, string> = {
    VERIFIED: "bg-emerald/10 text-emerald",
    PENDING:  "bg-amber-100 text-amber-700",
    FAILED:   "bg-clay/10 text-clay",
  }
  const icons: Record<KYCStatus, React.ReactNode> = {
    VERIFIED: <CheckCircle className="size-3" />,
    PENDING:  <Clock       className="size-3" />,
    FAILED:   <XCircle     className="size-3" />,
  }
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full", styles[status])}>
      {icons[status]}
      {status}
    </span>
  )
}

function IDTypeBadge({ type }: { type: IDType }) {
  const label = type === "MANUAL_OVERRIDE" ? "Override" : type
  return (
    <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-bone border border-bone-deep text-ink-soft">
      {label}
    </span>
  )
}

// ─── KYC History Dialog ───────────────────────────────────────────────────────

function KYCHistoryDialog({
  userId,
  onClose,
  onOverridden,
}: {
  userId: string | null
  onClose: () => void
  onOverridden: () => void
}) {
  const [history, setHistory]   = useState<KYCUserHistory | null>(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState("")
  const [overrideTier, setOverrideTier]     = useState("1")
  const [overrideStatus, setOverrideStatus] = useState<"PENDING" | "APPROVED" | "REJECTED">("APPROVED")
  const [reason, setReason]       = useState("")
  const [saving, setSaving]       = useState(false)
  const [saveError, setSaveError] = useState("")
  const [verifyingEmail, setVerifyingEmail] = useState(false)

  useEffect(() => {
    if (!userId) { setHistory(null); setError(""); return }
    setLoading(true)
    setError("")
    apiClient.get<KYCUserHistory>(`/admin/kyc/${userId}`)
      .then((r) => setHistory(r.data))
      .catch((err) => setError(handleApiError(err)))
      .finally(() => setLoading(false))
  }, [userId])

  function resetOverride() {
    setOverrideTier("1")
    setOverrideStatus("APPROVED")
    setReason("")
    setSaveError("")
  }

  async function submitOverride(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!userId) return
    setSaveError("")
    setSaving(true)
    try {
      await apiClient.post(`/admin/kyc/${userId}/override-tier`, {
        tier:   Number(overrideTier),
        status: overrideStatus,
        reason: reason.trim(),
      })
      toast.success("KYC tier override applied.")
      resetOverride()
      onOverridden()
      onClose()
    } catch (err) {
      setSaveError(handleApiError(err))
    } finally {
      setSaving(false)
    }
  }

  async function forceVerifyEmail() {
    if (!userId) return
    setVerifyingEmail(true)
    try {
      await apiClient.post(`/admin/kyc/${userId}/verify-email`)
      toast.success("Email marked as verified.")
      setHistory((h) => h ? { ...h, email_verified: true } : h)
    } catch (err) {
      toast.error(handleApiError(err))
    } finally {
      setVerifyingEmail(false)
    }
  }

  return (
    <Dialog open={!!userId} onOpenChange={(v) => { if (!v) { resetOverride(); onClose() } }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>KYC History</DialogTitle>
          {history && (
            <p className="text-sm text-muted-text">{history.user_email}</p>
          )}
        </DialogHeader>

        {loading && (
          <div className="space-y-3 py-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <p className="text-sm text-clay">{error}</p>
        )}

        {history && !loading && (
          <div className="space-y-5">
            {/* Email verification warning */}
            {!history.email_verified && (
              <div className="flex items-center justify-between bg-clay/10 border border-clay/30 rounded-lg px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <XCircle className="size-4 text-clay flex-shrink-0" />
                  <p className="text-sm text-clay font-medium">Email not verified</p>
                </div>
                <button
                  onClick={forceVerifyEmail}
                  disabled={verifyingEmail}
                  className="text-xs font-semibold text-clay underline underline-offset-2 hover:text-clay/80 disabled:opacity-50"
                >
                  {verifyingEmail ? "Verifying…" : "Force verify"}
                </button>
              </div>
            )}

            {/* Current tier summary */}
            <div className="bg-bone rounded-lg px-4 py-3 text-sm flex items-center justify-between">
              <div>
                <span className="text-muted-text">Current tier</span>
                <p className="font-semibold text-ink text-base">Tier {history.kyc_tier}</p>
              </div>
              <StatusBadge status={history.kyc_status as KYCStatus} />
            </div>

            {/* Record history */}
            <div>
              <p className="text-xs font-semibold text-muted-text uppercase tracking-wide mb-2">
                Verification history
              </p>
              {history.records.length === 0 ? (
                <p className="text-sm text-muted-text">No records found.</p>
              ) : (
                <div className="space-y-2">
                  {history.records.map((rec) => (
                    <div
                      key={rec.id}
                      className="bg-paper rounded-lg border border-bone-deep px-3 py-2.5 text-sm flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <IDTypeBadge type={rec.id_type} />
                          <StatusBadge status={rec.status} />
                        </div>
                        <p className="text-xs text-muted-text">
                          Submitted: {fmtDate(rec.created_at)}
                        </p>
                        {rec.verified_at && (
                          <p className="text-xs text-muted-text">
                            Verified: {fmtDate(rec.verified_at)}
                          </p>
                        )}
                        {rec.admin_note && (
                          <p className="text-xs text-ink-soft italic">{rec.admin_note}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Override Tier form */}
            <div className="border-t border-bone-deep pt-4">
              <p className="text-xs font-semibold text-muted-text uppercase tracking-wide mb-3">
                Override tier
              </p>
              <form onSubmit={submitOverride} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="override-tier">Tier</Label>
                    <Select
                      value={overrideTier}
                      onValueChange={(v) => { if (v !== null) setOverrideTier(v) }}
                    >
                      <SelectTrigger id="override-tier">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Tier 0</SelectItem>
                        <SelectItem value="1">Tier 1</SelectItem>
                        <SelectItem value="2">Tier 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="override-status">Status</Label>
                    <Select
                      value={overrideStatus}
                      onValueChange={(v) => { if (v !== null) setOverrideStatus(v as typeof overrideStatus) }}
                    >
                      <SelectTrigger id="override-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="APPROVED">APPROVED</SelectItem>
                        <SelectItem value="PENDING">PENDING</SelectItem>
                        <SelectItem value="REJECTED">REJECTED</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="override-reason">Reason</Label>
                  <textarea
                    id="override-reason"
                    placeholder="Admin note or reason for override…"
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                    className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  />
                </div>
                {saveError && <p className="text-sm text-clay">{saveError}</p>}
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { resetOverride(); onClose() }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving || !reason.trim()}>
                    {saving && <Loader2 className="size-4 animate-spin mr-1" />}
                    Apply override
                  </Button>
                </DialogFooter>
              </form>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function AdminKYCPageInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const statusFilter = searchParams?.get("status") ?? ""
  const idTypeFilter = searchParams?.get("id_type") ?? ""
  const page         = Number(searchParams?.get("page") ?? "1")

  const [records, setRecords]   = useState<KYCRecord[]>([])
  const [total, setTotal]       = useState(0)
  const [lastPage, setLastPage] = useState(1)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  const loadRecords = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("per_page", "25")
      if (statusFilter) params.set("status", statusFilter)
      if (idTypeFilter) params.set("id_type", idTypeFilter)
      const r = await apiClient.get<KYCListResponse>(`/admin/kyc?${params}`)
      setRecords(r.data.data)
      setTotal(r.data.total)
      setLastPage(r.data.last_page)
    } catch (err) {
      setError(handleApiError(err))
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, idTypeFilter])

  useEffect(() => { loadRecords() }, [loadRecords])

  function setParam(key: string, value: string) {
    const p = new URLSearchParams(searchParams?.toString() ?? "")
    if (value) p.set(key, value)
    else p.delete(key)
    p.delete("page")
    router.push(`/admin/kyc?${p}`)
  }

  function goPage(n: number) {
    const p = new URLSearchParams(searchParams?.toString() ?? "")
    p.set("page", String(n))
    router.push(`/admin/kyc?${p}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-ink">KYC Management</h1>
        <p className="text-sm text-muted-text mt-0.5">
          {loading ? "Loading…" : `${total} record${total !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="w-44">
          <Select
            value={statusFilter || "all"}
            onValueChange={(v) => setParam("status", v != null && v !== "all" ? v : "")}
          >
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="PENDING">PENDING</SelectItem>
              <SelectItem value="VERIFIED">VERIFIED</SelectItem>
              <SelectItem value="FAILED">FAILED</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-40">
          <Select
            value={idTypeFilter || "all"}
            onValueChange={(v) => setParam("id_type", v != null && v !== "all" ? v : "")}
          >
            <SelectTrigger>
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="BVN">BVN</SelectItem>
              <SelectItem value="NIN">NIN</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(statusFilter || idTypeFilter) && (
          <button
            onClick={() => router.push("/admin/kyc")}
            className="text-xs text-ink-soft hover:text-ink underline underline-offset-2"
          >
            Clear filters
          </button>
        )}
      </div>

      {error && !loading && <ErrorAlert message={error} onRetry={loadRecords} />}

      {/* Table */}
      <div className="bg-paper rounded-xl border-2 border-ink shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bone-deep bg-bone">
                <th className="text-left px-4 py-3 font-semibold text-ink-soft text-xs uppercase tracking-wide">User</th>
                <th className="text-left px-4 py-3 font-semibold text-ink-soft text-xs uppercase tracking-wide">ID Type</th>
                <th className="text-left px-4 py-3 font-semibold text-ink-soft text-xs uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-ink-soft text-xs uppercase tracking-wide">Verified at</th>
                <th className="text-left px-4 py-3 font-semibold text-ink-soft text-xs uppercase tracking-wide">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-bone-deep">
                    <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-12 rounded-full" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-20 rounded-full" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                  </tr>
                ))
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center text-muted-text text-sm">
                    No KYC records found.
                  </td>
                </tr>
              ) : (
                records.map((rec) => (
                  <tr
                    key={rec.id}
                    onClick={() => setSelectedUserId(rec.user_id)}
                    className="border-b border-bone-deep hover:bg-bone cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-ink">{rec.user_email}</td>
                    <td className="px-4 py-3"><IDTypeBadge type={rec.id_type} /></td>
                    <td className="px-4 py-3"><StatusBadge status={rec.status} /></td>
                    <td className="px-4 py-3 text-muted-text">{fmtDate(rec.verified_at)}</td>
                    <td className="px-4 py-3 text-muted-text">{fmtDate(rec.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && lastPage > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-bone-deep">
            <p className="text-xs text-muted-text">
              Page {page} of {lastPage}
            </p>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => goPage(page - 1)}
                className="px-2"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= lastPage}
                onClick={() => goPage(page + 1)}
                className="px-2"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* History / override dialog */}
      <KYCHistoryDialog
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
        onOverridden={loadRecords}
      />
    </div>
  )
}

export default function AdminKYCPage() {
  return (
    <Suspense>
      <AdminKYCPageInner />
    </Suspense>
  )
}
