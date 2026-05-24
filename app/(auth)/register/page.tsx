"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"
import { useAuthStore } from "@/lib/auth"
import apiClient from "@/lib/api"
import { registerSchema, type RegisterInput } from "@/lib/validations"
import { handleApiError } from "@/lib/handleApiError"
import type { AuthResponse } from "@/types/user"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

function passwordStrength(password: string): { label: string; color: string; score: number } {
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++

  if (score <= 1) return { label: "Weak", color: "bg-clay", score }
  if (score <= 2) return { label: "Fair", color: "bg-amber", score }
  return { label: "Strong", color: "bg-emerald", score }
}

function FieldStatus({ isDirty, isValid }: { isDirty: boolean; isValid: boolean }) {
  if (!isDirty) return null
  return isValid ? (
    <CheckCircle2 className="size-4 text-emerald absolute right-3 top-1/2 -translate-y-1/2" />
  ) : (
    <XCircle className="size-4 text-clay absolute right-3 top-1/2 -translate-y-1/2" />
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [serverError, setServerError] = useState("")
  const [terms, setTerms] = useState(false)
  const [phoneSuffix, setPhoneSuffix] = useState("")

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
  })

  const passwordValue = watch("password") ?? ""
  const strength = passwordStrength(passwordValue)

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 10)
    setPhoneSuffix(digits)
    setValue("phone", digits ? `+234${digits}` : "", {
      shouldValidate: true,
      shouldDirty: true,
    })
  }

  async function onSubmit(data: RegisterInput) {
    if (!terms) {
      setServerError("You must accept the Terms of Service to continue.")
      return
    }
    setServerError("")
    try {
      const { confirmPassword: _, ...payload } = data
      const res = await apiClient.post<AuthResponse>("/register", {
        first_name: payload.firstName,
        last_name: payload.lastName,
        email: payload.email,
        phone: payload.phone,
        password: payload.password,
        password_confirmation: data.confirmPassword,
      })
      setAuth(res.data.user, res.data.token)
      const pending = sessionStorage.getItem("nairaflow_pending_transfer")
      if (pending) {
        const { amount, currency } = JSON.parse(pending) as { amount: number; currency: string }
        sessionStorage.removeItem("nairaflow_pending_transfer")
        router.push(`/send?amount=${amount}&currency=${currency}`)
      } else {
        router.push("/dashboard")
      }
    } catch (err) {
      setServerError(handleApiError(err))
    }
  }

  function fieldBorder(name: keyof RegisterInput) {
    const dirty = !!dirtyFields[name]
    const error = !!errors[name]
    if (!dirty) return ""
    return error ? "border-clay/60 pr-9" : "border-emerald pr-9"
  }

  return (
    <Card className="w-full max-w-md border-2 border-ink shadow-md">
      <CardHeader className="text-center">
        <CardTitle className="text-xl font-display">Create your account</CardTitle>
        <CardDescription>Start sending money in minutes</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {serverError && (
            <p className="text-sm text-clay bg-clay/10 border border-clay/30 rounded-lg px-3 py-2">
              {serverError}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* First name */}
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First name</Label>
              <div className="relative">
                <Input
                  id="firstName"
                  placeholder="Ada"
                  {...register("firstName")}
                  className={fieldBorder("firstName")}
                />
                <FieldStatus isDirty={!!dirtyFields.firstName} isValid={!errors.firstName} />
              </div>
              {errors.firstName && <p className="text-xs text-clay">{errors.firstName.message}</p>}
            </div>

            {/* Last name */}
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <div className="relative">
                <Input
                  id="lastName"
                  placeholder="Obi"
                  {...register("lastName")}
                  className={fieldBorder("lastName")}
                />
                <FieldStatus isDirty={!!dirtyFields.lastName} isValid={!errors.lastName} />
              </div>
              {errors.lastName && <p className="text-xs text-clay">{errors.lastName.message}</p>}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="ada@example.com"
                {...register("email")}
                className={fieldBorder("email")}
              />
              <FieldStatus isDirty={!!dirtyFields.email} isValid={!errors.email} />
            </div>
            {errors.email && <p className="text-xs text-clay">{errors.email.message}</p>}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="phoneSuffix">Phone number</Label>
            <div className="flex gap-2">
              <span className="flex items-center px-3 bg-bone-deep border border-bone-deep rounded-md text-sm text-ink-soft font-medium">
                +234
              </span>
              <div className="relative flex-1">
                <Input
                  id="phoneSuffix"
                  type="tel"
                  inputMode="numeric"
                  placeholder="8012345678"
                  value={phoneSuffix}
                  onChange={handlePhoneChange}
                  maxLength={10}
                  className={fieldBorder("phone")}
                />
                <FieldStatus isDirty={!!dirtyFields.phone} isValid={!errors.phone} />
              </div>
            </div>
            {errors.phone && <p className="text-xs text-clay">{errors.phone.message}</p>}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                {...register("password")}
                className={fieldBorder("password")}
              />
              <FieldStatus isDirty={!!dirtyFields.password} isValid={!errors.password} />
            </div>
            {passwordValue && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={[
                        "h-1 flex-1 rounded-full transition-all",
                        i <= strength.score ? strength.color : "bg-bone-deep",
                      ].join(" ")}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-text">{strength.label}</p>
              </div>
            )}
            {errors.password && <p className="text-xs text-clay">{errors.password.message}</p>}
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                {...register("confirmPassword")}
                className={fieldBorder("confirmPassword")}
              />
              <FieldStatus isDirty={!!dirtyFields.confirmPassword} isValid={!errors.confirmPassword} />
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-clay">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Terms */}
          <div className="flex items-start gap-2">
            <input
              id="terms"
              type="checkbox"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              className="size-4 mt-0.5 rounded border-bone-deep accent-emerald"
            />
            <Label htmlFor="terms" className="text-sm font-normal cursor-pointer leading-snug">
              I agree to the{" "}
              <Link href="/terms" className="text-emerald hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-emerald hover:underline">
                Privacy Policy
              </Link>
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
                Creating account…
              </>
            ) : (
              "Create account"
            )}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-text">
          Already have an account?{" "}
          <Link href="/login" className="text-emerald font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}