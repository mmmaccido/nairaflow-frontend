"use client"

import { useState } from "react"
import Link from "next/link"
import { MailCheck, Loader2 } from "lucide-react"
import { useAuthStore } from "@/lib/auth"
import apiClient from "@/lib/api"
import { handleApiError } from "@/lib/handleApiError"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function VerifyEmailPage() {
  const user = useAuthStore((s) => s.user)
  const [loading, setLoading] = useState(false)
  const [resent, setResent] = useState(false)
  const [error, setError] = useState("")

  async function handleResend() {
    setError("")
    setLoading(true)
    try {
      await apiClient.post("/user/verify-email/resend")
      setResent(true)
    } catch (err) {
      setError(handleApiError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-sm border-2 border-ink shadow-md text-center">
      <CardHeader>
        <div className="flex justify-center mb-2">
          <MailCheck className="size-12 text-emerald" />
        </div>
        <CardTitle className="text-xl font-display">Check your inbox</CardTitle>
        <CardDescription>
          We sent a verification link to{" "}
          <strong>{user?.email ?? "your email address"}</strong>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p className="text-sm text-clay bg-clay/10 border border-clay/30 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        {resent ? (
          <p className="text-sm text-emerald bg-emerald/10 border border-emerald/30 rounded-lg px-3 py-2">
            Verification email resent.
          </p>
        ) : (
          <Button
            onClick={handleResend}
            disabled={loading}
            variant="outline"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                Sending…
              </>
            ) : (
              "Resend email"
            )}
          </Button>
        )}
        <p className="text-sm text-muted-text">
          <Link href="/login" className="text-emerald hover:underline">
            Back to login
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}