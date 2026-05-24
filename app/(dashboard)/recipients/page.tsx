"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Pencil, Trash2, UserPlus, Globe, Building2, Truck, Smartphone, ArrowRightLeft, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import apiClient from "@/lib/api"
import { handleApiError } from "@/lib/handleApiError"
import { ErrorAlert } from "@/components/shared/ErrorAlert"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RecipientForm } from "@/components/forms/RecipientForm"
import type { Recipient } from "@/types/recipient"

interface Paginated<T> {
  data: T[]
  total: number
  current_page: number
  last_page: number
}

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

function DeliveryIcon({ type, className }: { type: string; className?: string }) {
  const map: Record<string, React.ReactNode> = {
    BANK_WIRE:         <Globe      className={className} />,
    BANK_TRANSFER_NGN: <Building2  className={className} />,
    CASH_PICKUP:       <Truck      className={className} />,
    MOBILE_MONEY:      <Smartphone className={className} />,
  }
  return <>{map[type] ?? <ArrowRightLeft className={className} />}</>
}

function maskBankSummary(r: Recipient): string {
  const bd = r.bank_details
  if (bd.accountNumber) return `Account ****${bd.accountNumber.slice(-4)}`
  if (bd.iban)          return `IBAN ****${bd.iban.slice(-4)}`
  if (bd.mobileNumber)  return `Mobile ****${bd.mobileNumber.slice(-4)}`
  if (bd.phone)         return `Phone ${bd.phone}`
  return ""
}

function RecipientCard({
  recipient,
  onEdit,
  onDelete,
}: {
  recipient: Recipient
  onEdit: (r: Recipient) => void
  onDelete: (r: Recipient) => void
}) {
  const flag = COUNTRY_FLAGS[recipient.country_code] ?? "🌍"
  const bankSummary = maskBankSummary(recipient)

  return (
    <div className="bg-paper rounded-xl border-2 border-ink shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-10 rounded-full bg-bone-deep flex items-center justify-center text-lg flex-shrink-0">
            {flag}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-ink truncate">
              {recipient.first_name} {recipient.last_name}
            </p>
            <span className="inline-flex text-xs font-medium px-2 py-0.5 rounded-full bg-bone-deep text-muted-text mt-0.5">
              {recipient.currency}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onEdit(recipient)}
            className="p-1.5 rounded-lg hover:bg-bone-deep text-muted-text hover:text-ink transition-colors"
            aria-label="Edit recipient"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            onClick={() => onDelete(recipient)}
            className="p-1.5 rounded-lg hover:bg-clay/10 text-muted-text hover:text-clay transition-colors"
            aria-label="Delete recipient"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="border-t border-bone-deep pt-3 space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-muted-text">
          <DeliveryIcon type={recipient.delivery_type} className="size-3.5 text-muted-text flex-shrink-0" />
          <span>{DELIVERY_LABELS[recipient.delivery_type] ?? recipient.delivery_type}</span>
        </div>
        {bankSummary && (
          <p className="text-xs font-mono text-muted-text">{bankSummary}</p>
        )}
      </div>
    </div>
  )
}

export default function RecipientsPage() {
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [total, setTotal]           = useState(0)
  const [page, setPage]             = useState(1)
  const [lastPage, setLastPage]     = useState(1)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [editTarget, setEditTarget] = useState<Recipient | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Recipient | null>(null)
  const [deleting, setDeleting]     = useState(false)

  const loadRecipients = useCallback(async (p: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.get<Paginated<Recipient>>(`/recipients?per_page=12&page=${p}`)
      setRecipients(res.data.data)
      setTotal(res.data.total)
      setLastPage(res.data.last_page)
    } catch (err) {
      setError(handleApiError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRecipients(page)
  }, [page, loadRecipients])

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await apiClient.delete(`/recipients/${deleteTarget.id}`)
      setRecipients((prev) => prev.filter((r) => r.id !== deleteTarget.id))
      setTotal((t) => t - 1)
      toast.success("Recipient deleted")
    } catch (e) {
      toast.error(handleApiError(e))
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-ink mb-0.5">Recipients</h1>
          <p className="text-muted-text text-sm">
            {loading ? "Loading…" : `${total} saved recipient${total !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Link
          href="/recipients/new"
          className="flex items-center gap-2 bg-emerald hover:bg-emerald-deep text-bone text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors flex-shrink-0 border-2 border-ink shadow-sm"
        >
          <UserPlus className="size-4" />
          Add recipient
        </Link>
      </div>

      {error && !loading && <ErrorAlert message={error} onRetry={() => loadRecipients(page)} />}

      {/* Card grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-paper rounded-xl border-2 border-ink shadow-sm p-5 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
              </div>
              <Skeleton className="h-3 w-48 mt-3" />
            </div>
          ))}
        </div>
      ) : recipients.length === 0 ? (
        <div className="text-center py-20 bg-paper rounded-xl border-2 border-ink shadow-sm">
          <p className="text-muted-text text-sm mb-4">No saved recipients yet.</p>
          <Link
            href="/recipients/new"
            className="inline-flex items-center gap-2 bg-emerald hover:bg-emerald-deep text-bone text-sm font-medium px-4 py-2 rounded-lg transition-colors border-2 border-ink"
          >
            <UserPlus className="size-4" />
            Add your first recipient
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recipients.map((r) => (
            <RecipientCard
              key={r.id}
              recipient={r}
              onEdit={setEditTarget}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {lastPage > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-text">
            Page {page} of {lastPage} · {total} total
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
              onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
              disabled={page === lastPage}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-bone-deep rounded-lg hover:bg-bone disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit recipient</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <RecipientForm
              defaultValues={editTarget}
              recipientId={editTarget.id}
              onSuccess={(updated) => {
                setRecipients((prev) => prev.map((r) => r.id === updated.id ? updated : r))
                setEditTarget(null)
                toast.success("Recipient updated")
              }}
              submitLabel="Save changes →"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete recipient?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-ink-soft mt-1">
            This will permanently remove{" "}
            <span className="font-semibold text-ink">
              {deleteTarget?.first_name} {deleteTarget?.last_name}
            </span>{" "}
            from your saved recipients. This action cannot be undone.
          </p>
          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-clay hover:bg-clay-deep text-bone"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}