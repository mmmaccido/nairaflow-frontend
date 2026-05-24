"use client"

import { useState } from "react"
import Link from "next/link"
import { Loader2, MailCheck } from "lucide-react"
import apiClient from "@/lib/api"
import { handleApiError } from "@/lib/handleApiError"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await apiClient.post("/forgot-password", { email })
      setSent(true)
    } catch (err) {
      setError(handleApiError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-sm border-2 border-ink shadow-md">
      <CardHeader className="text-center">
        <CardTitle className="text-xl font-display">Reset your password</CardTitle>
        <CardDescription>
          {sent
            ? "Check your inbox for a reset link."
            : "Enter your email and we'll send you a link."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sent ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <MailCheck className="size-12 text-emerald" />
            <p className="text-sm text-ink-soft text-center">
              We sent a password reset link to <strong className="text-ink">{email}</strong>.
            </p>
            <Link href="/login" className="text-sm text-emerald hover:underline font-medium">
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-sm text-clay bg-clay/10 border border-clay/30 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-ink hover:bg-ink-soft text-bone"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Sending…
                </>
              ) : (
                "Send reset link"
              )}
            </Button>
            <p className="text-center text-sm text-muted-text">
              <Link href="/login" className="text-emerald hover:underline">
                Back to login
              </Link>
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  )
}