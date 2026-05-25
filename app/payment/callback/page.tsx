"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"

type Status = "loading" | "success" | "error"

function CallbackInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const reference = searchParams.get("reference") ?? ""
  const isMock = searchParams.get("mock") === "1"

  const [status, setStatus] = useState<Status>("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!reference) {
      setStatus("error")
      setMessage("No payment reference found.")
      return
    }

    if (isMock) {
      // Simulate the Paystack webhook so the transaction transitions PENDING → PAID.
      // Use fetch (not apiClient) to call the webhook at the backend root — it lives at
      // /webhooks/paystack, NOT under /api — and to avoid the 401 interceptor on failure.
      const backendOrigin = new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").origin
      fetch(`${backendOrigin}/webhooks/paystack`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "charge.success", data: { reference } }),
      })
        .catch(() => {})
        .finally(() => setStatus("success"))
      return
    }

    // Real Paystack callback — the webhook has already been fired by Paystack server-side.
    setStatus("success")
  }, [reference, isMock])

  const handleContinue = () => router.push("/transactions")

  return (
    <div className="min-h-screen bg-bone flex items-center justify-center p-4">
      <div className="bg-paper rounded-xl border-2 border-ink shadow-sm p-8 max-w-md w-full text-center space-y-5">
        {status === "loading" && (
          <>
            <Loader2 className="size-12 text-emerald mx-auto animate-spin" />
            <h1 className="text-xl font-bold font-display text-ink">Confirming payment…</h1>
            <p className="text-sm text-muted-text">Please wait while we verify your payment.</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="size-12 text-emerald mx-auto" />
            <h1 className="text-xl font-bold font-display text-ink">Payment received!</h1>
            <p className="text-sm text-muted-text">
              Your transfer is being processed. You&apos;ll receive updates as it progresses.
            </p>
            {isMock && (
              <p className="text-xs text-amber bg-amber/10 border border-amber/30 rounded-lg px-3 py-2">
                Mock mode — no real money moved.
              </p>
            )}
            <button
              onClick={handleContinue}
              className="w-full bg-emerald hover:bg-emerald-deep text-bone font-semibold text-sm py-3 rounded-xl transition-colors border-2 border-ink"
            >
              View my transactions →
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="size-12 text-clay mx-auto" />
            <h1 className="text-xl font-bold font-display text-ink">Something went wrong</h1>
            <p className="text-sm text-muted-text">{message}</p>
            <button
              onClick={() => router.push("/send")}
              className="w-full bg-emerald hover:bg-emerald-deep text-bone font-semibold text-sm py-3 rounded-xl transition-colors border-2 border-ink"
            >
              Try again →
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function PaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bone flex items-center justify-center">
          <Loader2 className="size-10 text-emerald animate-spin" />
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  )
}
