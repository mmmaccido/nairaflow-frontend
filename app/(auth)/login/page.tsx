"use client"

import { Suspense } from "react"
import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CheckCircle, Info, Loader2, XCircle } from "lucide-react"
import { useAuthStore } from "@/lib/auth"
import apiClient from "@/lib/api"
import { loginSchema, type LoginInput } from "@/lib/validations"
import { handleApiError } from "@/lib/handleApiError"
import type { AuthResponse } from "@/types/user"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get("from") ?? "/dashboard"
  const setAuth = useAuthStore((s) => s.setAuth)

  const [serverError, setServerError] = useState("")
  const [rememberMe, setRememberMe] = useState(false)

  const verifyBanner = useMemo(() => {
    const v = searchParams.get("verified")
    const e = searchParams.get("error")
    if (v === "1")        return { type: "success", message: "Email verified successfully! You can now log in." }
    if (v === "already")  return { type: "info",    message: "Your email is already verified. Please log in." }
    if (e === "invalid-link") return { type: "error", message: "This verification link is invalid or has expired. Please request a new one." }
    return null
  }, [searchParams])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginInput) {
    setServerError("")
    try {
      const res = await apiClient.post<AuthResponse>("/login", {
        ...data,
        remember: rememberMe,
      })
      setAuth(res.data.user, res.data.token)
      const pending = sessionStorage.getItem("nairaflow_pending_transfer")
      if (pending) {
        const { amount, currency } = JSON.parse(pending) as { amount: number; currency: string }
        sessionStorage.removeItem("nairaflow_pending_transfer")
        router.push(`/send?amount=${amount}&currency=${currency}`)
      } else {
        router.push(from)
      }
    } catch (err) {
      setServerError(handleApiError(err))
    }
  }

  return (
    <Card className="w-full max-w-sm border-2 border-ink shadow-md">
      <CardHeader className="text-center">
        <CardTitle className="text-xl font-display">Welcome back</CardTitle>
        <CardDescription>Sign in to your NairaFlow account</CardDescription>
      </CardHeader>
      <CardContent>
        {verifyBanner && (
          <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm mb-4 ${
            verifyBanner.type === "success" ? "bg-emerald/10 border-emerald/30 text-emerald-deep" :
            verifyBanner.type === "info"    ? "bg-sky-50 border-sky-200 text-sky-700" :
                                              "bg-clay/10 border-clay/30 text-clay"
          }`}>
            {verifyBanner.type === "success" && <CheckCircle className="size-4 mt-0.5 shrink-0" />}
            {verifyBanner.type === "info"    && <Info        className="size-4 mt-0.5 shrink-0" />}
            {verifyBanner.type === "error"   && <XCircle     className="size-4 mt-0.5 shrink-0" />}
            {verifyBanner.message}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {serverError && (
            <p className="text-sm text-clay bg-clay/10 border border-clay/30 rounded-lg px-3 py-2">
              {serverError}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              {...register("email")}
              className={errors.email ? "border-clay/60" : ""}
            />
            {errors.email && (
              <p className="text-xs text-clay">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="/forgot-password" className="text-xs text-emerald hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              {...register("password")}
              className={errors.password ? "border-clay/60" : ""}
            />
            {errors.password && (
              <p className="text-xs text-clay">{errors.password.message}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              id="remember"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="size-4 rounded border-bone-deep accent-emerald"
            />
            <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
              Remember me
            </Label>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-ink hover:bg-ink-soft text-bone"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-text">
          No account?{" "}
          <Link href="/register" className="text-emerald font-medium hover:underline">
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-sm h-96 animate-pulse rounded-xl bg-paper border-2 border-ink shadow-md" />}>
      <LoginForm />
    </Suspense>
  )
}