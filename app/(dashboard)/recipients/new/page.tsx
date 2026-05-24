"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { RecipientForm } from "@/components/forms/RecipientForm"
import type { Recipient } from "@/types/recipient"

export default function NewRecipientPage() {
  const router = useRouter()

  function handleSuccess(_recipient: Recipient) {
    toast.success("Recipient saved!")
    router.push("/recipients")
  }

  return (
    <div className="max-w-xl space-y-5">
      <div className="flex items-center gap-4">
        <Link
          href="/recipients"
          className="flex items-center gap-1.5 text-sm text-muted-text hover:text-ink transition-colors"
        >
          <ArrowLeft className="size-4" /> Back
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold font-display text-ink mb-0.5">Add recipient</h1>
        <p className="text-muted-text text-sm">Save bank details for future transfers.</p>
      </div>

      <div className="bg-paper rounded-xl border-2 border-ink shadow-sm p-6">
        <RecipientForm onSuccess={handleSuccess} submitLabel="Save recipient →" />
      </div>
    </div>
  )
}