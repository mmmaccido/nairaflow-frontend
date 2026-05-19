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
      await apiClient.post("/email/verification-notification")
      setResent(true)
    } catch (err) {
      setError(handleApiError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-sm shadow-sm text-center">
      <CardHeader>
        <div className="flex justify-center mb-2">
          <MailCheck className="size-12 text-green-600" />
        </div>
        <CardTitle className="text-xl font-sora">Check your inbox</CardTitle>
        <CardDescription>
          We sent a verification link to{" "}
          <strong>{user?.email ?? "your email address"}</strong>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        {resent ? (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
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
        <p className="text-sm text-slate-500">
          <Link href="/login" className="text-green-700 hover:underline">
            Back to login
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
