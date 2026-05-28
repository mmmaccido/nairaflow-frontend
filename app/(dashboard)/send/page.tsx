"use client"

import { useState, useEffect, useCallback, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2, Clock, Building2, Truck, Smartphone, Globe } from "lucide-react"
import { useAuthStore } from "@/lib/auth"
import apiClient from "@/lib/api"
import { handleApiError } from "@/lib/handleApiError"
import type { Rate } from "@/types/rate"
import type { Recipient } from "@/types/recipient"
import { StepIndicator } from "@/components/shared/StepIndicator"
import { RecipientForm, COUNTRIES, CURRENCY_TO_COUNTRY } from "@/components/forms/RecipientForm"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const CURRENCIES = [
  { code: "USD", label: "🇺🇸 USD · US Dollar" },
  { code: "CAD", label: "🇨🇦 CAD · Canadian Dollar" },
  { code: "GBP", label: "🇬🇧 GBP · British Pound" },
  { code: "EUR", label: "🇪🇺 EUR · Euro" },
  { code: "TRY", label: "🇹🇷 TRY · Turkish Lira" },
  { code: "AUD", label: "🇦🇺 AUD · Australian Dollar" },
  { code: "GHS", label: "🇬🇭 GHS · Ghanaian Cedi" },
  { code: "ZAR", label: "🇿🇦 ZAR · South African Rand" },
  { code: "NGN", label: "🇳🇬 NGN · Nigerian Naira" },
]

const DELIVERY_METHODS = [
  {
    value: "BANK_WIRE",
    icon: Globe,
    label: "International Bank Wire",
    desc: "Direct to any international bank account",
    showFor: (_: string) => true,
  },
  {
    value: "BANK_TRANSFER_NGN",
    icon: Building2,
    label: "NGN Bank Transfer",
    desc: "Direct to a Nigerian bank account",
    showFor: (c: string) => c === "NGN",
  },
  {
    value: "CASH_PICKUP",
    icon: Truck,
    label: "Cash Delivery",
    desc: "Agent network cash pickup in Nigeria",
    showFor: (c: string) => c === "NGN",
  },
  {
    value: "MOBILE_MONEY",
    icon: Smartphone,
    label: "Mobile Money",
    desc: "Send directly to MTN MoMo, Vodafone Cash, etc.",
    showFor: (c: string) => c === "GHS",
  },
]

const RATE_LOCK_CURRENCIES = ["TRY", "ZAR", "GHS"]
const STEPS = ["Amount & Delivery", "Recipient", "Review & Pay"]

function computeFee(amount: number): number {
  return Math.min(Math.max(amount * 0.01, 500), 5000)
}

function formatNGN(value: string): string {
  const digits = value.replace(/\D/g, "")
  if (!digits) return ""
  return Number(digits).toLocaleString("en-NG")
}

function parseNGN(formatted: string): number {
  return Number(formatted.replace(/,/g, "")) || 0
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

function maskRecipient(r: Recipient): string {
  const bd = r.bank_details
  if (!bd) return `${r.first_name} ${r.last_name}`
  if (bd.mobileNumber) return `📱 ****${bd.mobileNumber.slice(-4)}`
  if (bd.iban) return `IBAN ****${bd.iban.slice(-4)}`
  if (bd.accountNumber) return `Acct ****${bd.accountNumber.slice(-4)}`
  if (bd.phone) return `📞 ${bd.phone}`
  return ""
}

function SendFlow() {
  const searchParams = useSearchParams()
  const { isAuthenticated } = useAuthStore()

  // Wizard state
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Step 1
  const [ngnInput, setNgnInput] = useState("")
  const [currency, setCurrency] = useState("USD")
  const [deliveryMethod, setDeliveryMethod] = useState("")
  const [rate, setRate] = useState<Rate | null>(null)
  const [rateLoading, setRateLoading] = useState(true)
  const [rateStale, setRateStale] = useState(false)
  const [debouncedAmount, setDebouncedAmount] = useState(0)

  // Step 2
  const [recipientTab, setRecipientTab] = useState("saved")
  const [savedRecipients, setSavedRecipients] = useState<Recipient[]>([])
  const [recipientsLoading, setRecipientsLoading] = useState(false)
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null)
  const [newRecipient, setNewRecipient] = useState<Recipient | null>(null)

  // Step 3
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [timeLeft, setTimeLeft] = useState(0)
  const payingRef = useRef(false)

  const amount = parseNGN(ngnInput)
  const fee = amount >= 1000 ? computeFee(amount) : 0
  const totalNGN = amount + fee
  const converted = rate && debouncedAmount > 0 ? debouncedAmount / rate.our_rate : 0

  const activeDeliveryMethods = DELIVERY_METHODS.filter((m) => m.showFor(currency))

  // Pre-fill from query params on mount
  useEffect(() => {
    const amt = searchParams.get("amount")
    const cur = searchParams.get("currency")
    if (amt) {
      const n = Number(amt)
      if (!isNaN(n) && n > 0) setNgnInput(n.toLocaleString("en-NG"))
    }
    if (cur && CURRENCIES.some((c) => c.code === cur)) setCurrency(cur)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounce amount for conversion display
  useEffect(() => {
    const t = setTimeout(() => setDebouncedAmount(amount), 300)
    return () => clearTimeout(t)
  }, [amount])

  // Fetch rate when currency changes
  const fetchRate = useCallback(async (cur: string) => {
    setRateStale(false)
    setRate(null)
    try {
      const res = await apiClient.get<Rate>(`/rates/${cur}`)
      setRate(res.data)
    } catch {
      setRateStale(true)
    } finally {
      setRateLoading(false)
    }
  }, [])

  useEffect(() => {
    setRateLoading(true)
    fetchRate(currency)
  }, [currency, fetchRate])

  // Reset delivery method when currency changes
  useEffect(() => {
    setDeliveryMethod("")
  }, [currency])

  // Fetch saved recipients when entering step 2
  useEffect(() => {
    if (step !== 2 || !isAuthenticated) return
    setRecipientsLoading(true)
    apiClient
      .get<{ data: Recipient[] }>("/recipients")
      .then((r) => setSavedRecipients(r.data.data ?? []))
      .catch(() => {})
      .finally(() => setRecipientsLoading(false))
  }, [step, isAuthenticated])

  // Countdown timer in step 3
  useEffect(() => {
    if (step !== 3) return
    const lockMinutes = RATE_LOCK_CURRENCIES.includes(currency) ? 15 : 30
    setTimeLeft(lockMinutes * 60)
    const id = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000)
    return () => clearInterval(id)
  }, [step, currency])

  const recipient = recipientTab === "saved" ? selectedRecipient : newRecipient
  const canContinueStep1 = amount >= 1000 && !!deliveryMethod
  const canContinueStep2 = !!recipient

  async function handlePay() {
    if (!recipient || !termsAccepted || payingRef.current) return
    payingRef.current = true
    setSubmitting(true)
    setSubmitError("")
    try {
      const res = await apiClient.post<{ transactionId: string; authorizationUrl: string }>("/transactions", {
        ngn_amount: amount,
        target_currency: currency,
        delivery_type: deliveryMethod,
        recipient_id: recipient.id || undefined,
      })
      const redirectUrl = res.data.authorizationUrl
      if (!redirectUrl || typeof redirectUrl !== "string") {
        throw new Error("Payment gateway did not return a redirect URL. Please try again.")
      }
      window.location.href = redirectUrl
    } catch (err) {
      setSubmitError(handleApiError(err))
    } finally {
      payingRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-ink mb-1">Send Money</h1>
        <p className="text-muted-text text-sm">Fast, transparent transfers with live rates.</p>
      </div>

      <StepIndicator steps={STEPS} current={step} />

      {/* ── STEP 1 ──────────────────────────────────── */}
      {step === 1 && (
        <div className="bg-paper rounded-xl border-2 border-ink shadow-sm p-6 space-y-5">
          {/* Amount input */}
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1.5">
              You send (NGN ₦)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={ngnInput}
              onChange={(e) => setNgnInput(formatNGN(e.target.value))}
              placeholder="50,000"
              className="w-full rounded-lg border border-bone-deep px-3 py-2.5 text-sm font-medium outline-none focus:border-emerald transition-colors bg-paper text-ink"
            />
            {amount > 0 && amount < 1000 && (
              <p className="text-xs text-clay mt-1">Minimum transfer is ₦1,000</p>
            )}
          </div>

          {/* Currency selector */}
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1.5">
              Recipient gets
            </label>
            <Select value={currency} onValueChange={(v) => v && setCurrency(v)}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {CURRENCIES.find((c) => c.code === currency)?.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(({ code, label }) => (
                  <SelectItem key={code} value={code}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Conversion preview */}
          <div className="rounded-xl bg-emerald/10 p-4">
            {rateLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-7 w-32" />
              </div>
            ) : rateStale ? (
              <p className="text-amber text-sm font-medium">Rate may be outdated — check back shortly.</p>
            ) : (
              <>
                <p className="text-xs text-muted-text mb-0.5">Recipient gets</p>
                <p className="text-2xl font-bold font-display text-ink">
                  {rate?.symbol}{converted > 0 ? converted.toFixed(2) : "0.00"}
                  <span className="text-base font-medium text-ink-soft ml-1">{currency}</span>
                </p>
                {rate && (
                  <p className="text-xs text-muted-text mt-1">
                    Rate: ₦{rate.our_rate.toLocaleString("en-NG")} / {currency}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Delivery method cards */}
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-2">Delivery method</label>
            <div className="space-y-2">
              {activeDeliveryMethods.map(({ value, icon: Icon, label, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDeliveryMethod(value)}
                  className={cn(
                    "w-full flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-colors",
                    deliveryMethod === value
                      ? "border-emerald bg-emerald/10"
                      : "border-bone-deep hover:border-ink"
                  )}
                >
                  <div className={cn(
                    "size-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                    deliveryMethod === value ? "bg-emerald" : "bg-bone-deep"
                  )}>
                    <Icon className={cn("size-4", deliveryMethod === value ? "text-bone" : "text-muted-text")} />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-ink">{label}</p>
                    <p className="text-xs text-muted-text mt-0.5">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Rate lock warning */}
          {RATE_LOCK_CURRENCIES.includes(currency) && (
            <div className="flex items-center gap-2 text-xs text-amber bg-amber/10 border border-amber/30 rounded-lg px-3 py-2">
              <Clock className="size-3.5 flex-shrink-0" />
              Rate locked for 15 minutes after payment
            </div>
          )}

          {/* Fee breakdown */}
          {amount >= 1000 && fee > 0 && (
            <div className="text-xs text-muted-text bg-bone rounded-lg px-4 py-3 space-y-1">
              <div className="flex justify-between">
                <span>Transfer</span>
                <span className="font-medium text-ink-soft">₦{amount.toLocaleString("en-NG")}</span>
              </div>
              <div className="flex justify-between">
                <span>Fee</span>
                <span className="font-medium text-ink-soft">₦{fee.toLocaleString("en-NG")}</span>
              </div>
              <div className="flex justify-between font-semibold text-ink pt-1 border-t border-bone-deep">
                <span>Total</span>
                <span>₦{totalNGN.toLocaleString("en-NG")}</span>
              </div>
            </div>
          )}

          <button
            onClick={() => setStep(2)}
            disabled={!canContinueStep1}
            className="w-full bg-emerald hover:bg-emerald-deep disabled:bg-bone-deep disabled:text-muted-text disabled:cursor-not-allowed text-bone font-semibold text-sm py-3 rounded-xl transition-colors border-2 border-ink disabled:border-bone-deep"
          >
            Continue →
          </button>
        </div>
      )}

      {/* ── STEP 2 ──────────────────────────────────── */}
      {step === 2 && (
        <div className="bg-paper rounded-xl border-2 border-ink shadow-sm p-6 space-y-5">
          <Tabs
            value={recipientTab}
            onValueChange={(v) => { if (v) { setRecipientTab(v); setSelectedRecipient(null); setNewRecipient(null) } }}
          >
            <TabsList className="w-full mb-4">
              <TabsTrigger value="saved" className="flex-1">Saved recipients</TabsTrigger>
              <TabsTrigger value="new" className="flex-1">New recipient</TabsTrigger>
            </TabsList>

            <TabsContent value="saved">
              {recipientsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-xl" />
                  ))}
                </div>
              ) : savedRecipients.length === 0 ? (
                <div className="text-center py-8 text-muted-text">
                  <p className="text-sm mb-2">No saved recipients yet.</p>
                  <button
                    onClick={() => setRecipientTab("new")}
                    className="text-emerald text-sm font-medium hover:underline"
                  >
                    Add a new recipient →
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {savedRecipients.map((r) => {
                    const country = COUNTRIES.find((c) => c.code === r.country_code)
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelectedRecipient(r)}
                        className={cn(
                          "w-full flex items-center gap-4 rounded-xl border-2 px-4 py-3 text-left transition-colors",
                          selectedRecipient?.id === r.id
                            ? "border-emerald bg-emerald/10"
                            : "border-bone-deep hover:border-ink"
                        )}
                      >
                        <div className="size-10 rounded-full bg-bone-deep flex items-center justify-center text-lg flex-shrink-0">
                          {country?.flag ?? "🌍"}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-ink">
                            {r.first_name} {r.last_name}
                          </p>
                          <p className="text-xs text-muted-text truncate">
                            {country?.name} · {r.currency} · {maskRecipient(r)}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="new">
              {newRecipient ? (
                <div className="rounded-xl border-2 border-emerald bg-emerald/10 px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm text-ink">
                      {newRecipient.first_name} {newRecipient.last_name}
                    </p>
                    <p className="text-xs text-muted-text">{maskRecipient(newRecipient)}</p>
                  </div>
                  <button
                    onClick={() => setNewRecipient(null)}
                    className="text-xs text-muted-text hover:text-ink underline"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <RecipientForm
                  defaultCountry={CURRENCY_TO_COUNTRY[currency]}
                  onSuccess={(r) => setNewRecipient(r)}
                  submitLabel="Save recipient →"
                />
              )}
            </TabsContent>
          </Tabs>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setStep(1)}
              className="flex-1 border border-bone-deep text-ink-soft hover:bg-bone font-semibold text-sm py-3 rounded-xl transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!canContinueStep2}
              className="flex-1 bg-emerald hover:bg-emerald-deep disabled:bg-bone-deep disabled:text-muted-text disabled:cursor-not-allowed text-bone font-semibold text-sm py-3 rounded-xl transition-colors border-2 border-ink disabled:border-bone-deep"
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3 ──────────────────────────────────── */}
      {step === 3 && recipient && (
        <div className="bg-paper rounded-xl border-2 border-ink shadow-sm p-6 space-y-5">
          {/* Summary */}
          <div className="rounded-xl bg-bone p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-text">You send</span>
              <span className="font-semibold text-ink">₦{amount.toLocaleString("en-NG")}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-text">Recipient gets</span>
              <span className="font-semibold text-emerald text-lg">
                {rate?.symbol}{converted.toFixed(2)} {currency}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-text">Fee</span>
              <span className="font-medium text-ink-soft">₦{fee.toLocaleString("en-NG")}</span>
            </div>
            <div className="flex items-center justify-between border-t border-bone-deep pt-3">
              <span className="text-sm font-semibold text-ink">Total deducted</span>
              <span className="font-bold text-ink">₦{totalNGN.toLocaleString("en-NG")}</span>
            </div>
          </div>

          {/* Recipient details */}
          <div className="rounded-xl border border-bone-deep p-4 space-y-2">
            <p className="text-xs font-medium text-muted-text uppercase tracking-wide">Recipient</p>
            <p className="font-semibold text-ink">
              {recipient.first_name} {recipient.last_name}
            </p>
            <p className="text-sm text-muted-text">
              {COUNTRIES.find((c) => c.code === recipient.country_code)?.flag}{" "}
              {COUNTRIES.find((c) => c.code === recipient.country_code)?.name} ·{" "}
              {DELIVERY_METHODS.find((m) => m.value === deliveryMethod)?.label}
            </p>
            <p className="text-sm text-muted-text">{maskRecipient(recipient)}</p>
          </div>

          {/* Rate + countdown */}
          <div className="flex items-center justify-between text-sm">
            <div>
              <span className="text-muted-text">Rate used: </span>
              <span className="font-medium text-ink">
                ₦{rate?.our_rate?.toLocaleString("en-NG")} / {currency}
              </span>
            </div>
            <div className={cn(
              "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full",
              timeLeft > 120 ? "bg-emerald/10 text-emerald" : "bg-amber/10 text-amber"
            )}>
              <Clock className="size-3.5" />
              Rate locked · {formatTime(timeLeft)}
            </div>
          </div>

          {/* Terms */}
          <div className="flex items-start gap-2.5">
            <input
              id="terms_pay"
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="size-4 mt-0.5 rounded border-bone-deep accent-emerald"
            />
            <label htmlFor="terms_pay" className="text-sm text-ink-soft cursor-pointer">
              I confirm the recipient details are correct and agree to the{" "}
              <a href="/terms" className="text-emerald hover:underline">Terms of Service</a>
            </label>
          </div>

          {submitError && (
            <p className="text-sm text-clay bg-clay/10 border border-clay/30 rounded-lg px-3 py-2">
              {submitError}
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex-1 border border-bone-deep text-ink-soft hover:bg-bone font-semibold text-sm py-3 rounded-xl transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={handlePay}
              disabled={!termsAccepted || submitting || timeLeft === 0}
              className="flex-1 bg-emerald hover:bg-emerald-deep disabled:bg-bone-deep disabled:text-muted-text disabled:cursor-not-allowed text-bone font-semibold text-sm py-3 rounded-xl transition-colors border-2 border-ink disabled:border-bone-deep flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Processing…
                </>
              ) : (
                "Confirm and pay with Paystack →"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SendPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      }
    >
      <SendFlow />
    </Suspense>
  )
}
