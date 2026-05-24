"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { useAuthStore } from "@/lib/auth"
import apiClient from "@/lib/api"
import { handleApiError } from "@/lib/handleApiError"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { User } from "@/types/user"

// ─── Schemas ─────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  first_name: z.string().min(1, { error: "First name required" }),
  last_name:  z.string().min(1, { error: "Last name required" }),
  email:      z.string().email({ error: "Valid email required" }),
  phone:      z.string().regex(/^\+234[0-9]{10}$/, { error: "Format: +234XXXXXXXXXX" }),
})

const passwordSchema = z
  .object({
    current_password:          z.string().min(1, { error: "Required" }),
    new_password:              z.string().min(8, { error: "At least 8 characters" }),
    new_password_confirmation: z.string().min(1, { error: "Required" }),
  })
  .superRefine((d, ctx) => {
    if (d.new_password !== d.new_password_confirmation) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["new_password_confirmation"], message: "Passwords do not match" })
    }
    if (!/[A-Z]/.test(d.new_password)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["new_password"], message: "Must include an uppercase letter" })
    }
    if (!/[0-9]/.test(d.new_password)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["new_password"], message: "Must include a number" })
    }
    if (!/[^a-zA-Z0-9]/.test(d.new_password)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["new_password"], message: "Must include a special character" })
    }
  })

type ProfileValues  = z.infer<typeof profileSchema>
type PasswordValues = z.infer<typeof passwordSchema>

// ─── Helpers ─────────────────────────────────────────────────────────────────

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0
  if (pw.length >= 8)           score++
  if (/[A-Z]/.test(pw))        score++
  if (/[0-9]/.test(pw))        score++
  if (/[^a-zA-Z0-9]/.test(pw)) score++
  if (score <= 1) return { score, label: "Weak",   color: "bg-clay" }
  if (score <= 2) return { score, label: "Fair",   color: "bg-amber" }
  return              { score, label: "Strong", color: "bg-emerald" }
}

const NOTIF_KEYS = [
  { key: "notif_sms_sent",       label: "SMS on transfer sent" },
  { key: "notif_sms_received",   label: "SMS on transfer received" },
  { key: "notif_email_receipt",  label: "Email receipt on completion" },
] as const

// ─── Section wrapper ─────────────────────────────────────────────────────────

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-paper rounded-xl border-2 border-ink shadow-sm p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {description && <p className="text-sm text-muted-text mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-clay mt-0.5">{message}</p>
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user, token, setAuth } = useAuthStore()

  // ── Profile form ──────────────────────────────────────────────────────────
  const {
    register: regProfile,
    handleSubmit: handleProfile,
    formState: { errors: pe, isSubmitting: profileSaving },
    reset: resetProfile,
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: user?.first_name ?? "",
      last_name:  user?.last_name  ?? "",
      email:      user?.email      ?? "",
      phone:      user?.phone      ?? "",
    },
  })

  // re-populate if auth store hydrates after mount
  useEffect(() => {
    if (user) {
      resetProfile({
        first_name: user.first_name,
        last_name:  user.last_name,
        email:      user.email,
        phone:      user.phone,
      })
    }
  }, [user, resetProfile])

  async function onProfileSubmit(data: ProfileValues) {
    try {
      const res = await apiClient.put<{ user: User }>("/user", data)
      setAuth(res.data.user, token!)
      toast.success("Profile updated")
    } catch (err) {
      toast.error(handleApiError(err))
    }
  }

  // ── Phone helper ──────────────────────────────────────────────────────────
  const [phoneSuffix, setPhoneSuffix] = useState(user?.phone?.replace(/^\+234/, "") ?? "")

  // ── Password form ─────────────────────────────────────────────────────────
  const [showCurrent, setShowCurrent]   = useState(false)
  const [showNew, setShowNew]           = useState(false)
  const [showConfirm, setShowConfirm]   = useState(false)
  const [passwordError, setPasswordError] = useState("")

  const {
    register: regPw,
    handleSubmit: handlePw,
    watch: watchPw,
    reset: resetPw,
    setError: setPwError,
    formState: { errors: pwe, isSubmitting: pwSaving },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    mode: "onBlur",
  })

  const newPw = watchPw("new_password") ?? ""
  const strength = passwordStrength(newPw)

  async function onPasswordSubmit(data: PasswordValues) {
    setPasswordError("")
    try {
      await apiClient.put("/user/password", {
        current_password:          data.current_password,
        new_password:              data.new_password,
        new_password_confirmation: data.new_password_confirmation,
      })
      resetPw()
      toast.success("Password updated")
    } catch (err) {
      const msg = handleApiError(err)
      if (msg.toLowerCase().includes("current password")) {
        setPwError("current_password", { message: "Current password is incorrect" })
      } else {
        setPasswordError(msg)
      }
    }
  }

  // ── 2FA modal ─────────────────────────────────────────────────────────────
  const [twoFaOpen, setTwoFaOpen] = useState(false)

  // ── Notification preferences ──────────────────────────────────────────────
  const [notifs, setNotifs] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {}
    NOTIF_KEYS.forEach(({ key }) => { defaults[key] = true })
    return defaults
  })

  useEffect(() => {
    const loaded: Record<string, boolean> = {}
    NOTIF_KEYS.forEach(({ key }) => {
      const stored = localStorage.getItem(key)
      loaded[key] = stored === null ? true : stored === "true"
    })
    setNotifs(loaded)
  }, [])

  function toggleNotif(key: string) {
    setNotifs((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      localStorage.setItem(key, String(next[key]))
      return next
    })
  }

  const labelCls = "mb-1.5 block text-sm font-medium text-ink-soft"
  const inputCls = "mt-0"

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-ink mb-0.5">Settings</h1>
        <p className="text-muted-text text-sm">Manage your account preferences.</p>
      </div>

      {/* ── Profile ─────────────────────────────────────────────────────── */}
      <Section title="Profile" description="Update your personal information.">
        <form onSubmit={handleProfile(onProfileSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className={labelCls}>First name</Label>
              <Input className={inputCls} {...regProfile("first_name")} />
              <FieldError message={pe.first_name?.message} />
            </div>
            <div>
              <Label className={labelCls}>Last name</Label>
              <Input className={inputCls} {...regProfile("last_name")} />
              <FieldError message={pe.last_name?.message} />
            </div>
          </div>
          <div>
            <Label className={labelCls}>Email</Label>
            <Input className={inputCls} type="email" {...regProfile("email")} />
            <FieldError message={pe.email?.message} />
          </div>
          <div>
            <Label className={labelCls}>Phone</Label>
            <div className="flex items-center">
              <span className="inline-flex items-center px-3 h-10 rounded-l-md border border-r-0 border-bone-deep bg-bone text-muted-text text-sm">
                +234
              </span>
              <Input
                className="rounded-l-none"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="8012345678"
                value={phoneSuffix}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 10)
                  setPhoneSuffix(digits)
                  regProfile("phone").onChange({
                    target: { value: digits ? `+234${digits}` : "", name: "phone" },
                  })
                }}
              />
            </div>
            <FieldError message={pe.phone?.message} />
          </div>
          <Button
            type="submit"
            disabled={profileSaving}
            className="bg-emerald hover:bg-emerald-deep text-bone"
          >
            {profileSaving && <Loader2 className="size-4 animate-spin mr-2" />}
            Save profile
          </Button>
        </form>
      </Section>

      {/* ── Security ─────────────────────────────────────────────────────── */}
      <Section title="Security" description="Manage your password and two-factor authentication.">
        <div className="space-y-6">
          {/* Change password */}
          <div>
            <h3 className="text-sm font-semibold text-ink-soft mb-3">Change password</h3>
            <form onSubmit={handlePw(onPasswordSubmit)} className="space-y-4">
              {passwordError && (
                <p className="text-sm text-clay bg-clay/10 border border-clay/30 rounded-lg px-3 py-2">
                  {passwordError}
                </p>
              )}
              <div>
                <Label className={labelCls}>Current password</Label>
                <div className="relative">
                  <Input
                    type={showCurrent ? "text" : "password"}
                    className="pr-10"
                    {...regPw("current_password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-text"
                  >
                    {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <FieldError message={pwe.current_password?.message} />
              </div>
              <div>
                <Label className={labelCls}>New password</Label>
                <div className="relative">
                  <Input
                    type={showNew ? "text" : "password"}
                    className="pr-10"
                    {...regPw("new_password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-text"
                  >
                    {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {/* Strength bars */}
                {newPw && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={cn(
                            "h-1 flex-1 rounded-full transition-colors",
                            i <= strength.score ? strength.color : "bg-bone-deep"
                          )}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-text">{strength.label}</p>
                  </div>
                )}
                <FieldError message={pwe.new_password?.message} />
              </div>
              <div>
                <Label className={labelCls}>Confirm new password</Label>
                <div className="relative">
                  <Input
                    type={showConfirm ? "text" : "password"}
                    className="pr-10"
                    {...regPw("new_password_confirmation")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-text"
                  >
                    {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <FieldError message={pwe.new_password_confirmation?.message} />
              </div>
              <Button
                type="submit"
                disabled={pwSaving}
                className="bg-emerald hover:bg-emerald-deep text-bone"
              >
                {pwSaving && <Loader2 className="size-4 animate-spin mr-2" />}
                Update password
              </Button>
            </form>
          </div>

          {/* 2FA */}
          <div className="border-t border-bone-deep pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-ink-soft">Two-factor authentication</p>
                <p className="text-xs text-muted-text mt-0.5">
                  Status: <span className={user?.two_factor_enabled ? "text-emerald font-medium" : "text-muted-text"}>
                    {user?.two_factor_enabled ? "Enabled" : "Disabled"}
                  </span>
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setTwoFaOpen(true)}>
                {user?.two_factor_enabled ? "Manage 2FA" : "Enable 2FA"}
              </Button>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Notifications ─────────────────────────────────────────────────── */}
      <Section title="Notification preferences" description="Choose how you want to be notified about your transfers.">
        <div className="space-y-4">
          {NOTIF_KEYS.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm text-ink-soft">{label}</span>
              <button
                onClick={() => toggleNotif(key)}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                  notifs[key] ? "bg-emerald" : "bg-bone-deep"
                )}
                role="switch"
                aria-checked={notifs[key]}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                    notifs[key] ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      </Section>

      {/* 2FA dialog */}
      <Dialog open={twoFaOpen} onOpenChange={setTwoFaOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Two-factor authentication</DialogTitle>
          </DialogHeader>
          <div className="text-center py-6 space-y-3">
            <div className="size-14 rounded-full bg-amber/15 flex items-center justify-center mx-auto text-2xl">
              🔐
            </div>
            <p className="text-sm text-ink-soft">
              Two-factor authentication is coming soon. We&apos;ll notify you when it&apos;s available.
            </p>
          </div>
          <Button variant="outline" className="w-full" onClick={() => setTwoFaOpen(false)}>
            Got it
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
