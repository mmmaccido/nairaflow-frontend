"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, Clock, Building2, Banknote, Truck, Smartphone, Globe } from "lucide-react"
import { useAuthStore } from "@/lib/auth"
import apiClient from "@/lib/api"
import { handleApiError } from "@/lib/handleApiError"
import type { Rate } from "@/types/rate"
import type { Recipient } from "@/types/recipient"
import type { Transaction } from "@/types/transaction"
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
  if (bd.mobileNumber) return `📱 ****${bd.mobileNumber.slice(-4)}`
  if (bd.iban) return `IBAN ****${bd.iban.slice(-4)}`
  if (bd.accountNumber) return `Acct ****${bd.accountNumber.slice(-4)}`
  if (bd.phone) return `📞 ${bd.phone}`
  return ""
}

function SendFlow() {
  const router = useRouter()
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
      .get<Recipient[]>("/recipients")
      .then((r) => setSavedRecipients(r.data))
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
    if (!recipient || !termsAccepted) return
    setSubmitting(true)
    setSubmitError("")
    try {
      const res = await apiClient.post<{ transaction: Transaction; payment_url: string }>("/transactions", {
        ngn_amount: amount,
        target_currency: currency,
        delivery_type: deliveryMethod,
        recipient_id: recipient.id || undefined,
      })
      window.location.href = res.data.payment_url
    } catch (err) {
      setSubmitError(handleApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-sora text-slate-900 mb-1">Send Money</h1>
        <p className="text-slate-500 text-sm">Fast, transparent transfers with live rates.</p>
      </div>

      <StepIndicator steps={STEPS} current={step} />

      {/* ── STEP 1 ──────────────────────────────────── */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-5">
          {/* Amount input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              You send (NGN ₦)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={ngnInput}
              onChange={(e) => setNgnInput(formatNGN(e.target.value))}
              placeholder="50,000"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium outline-none focus:border-green-500 transition-colors"
            />
            {amount > 0 && amount < 1000 && (
              <p className="text-xs text-red-500 mt-1">Minimum transfer is ₦1,000</p>
            )}
          </div>

          {/* Currency selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
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
          <div className="rounded-xl bg-green-50 p-4">
            {rateLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-7 w-32" />
              </div>
            ) : rateStale ? (
              <p className="text-amber-600 text-sm font-medium">Rate may be outdated — check back shortly.</p>
            ) : (
              <>
                <p className="text-xs text-slate-500 mb-0.5">Recipient gets</p>
                <p className="text-2xl font-bold font-sora text-slate-900">
                  {rate?.symbol}{converted > 0 ? converted.toFixed(2) : "0.00"}
                  <span className="text-base font-medium text-slate-500 ml-1">{currency}</span>
                </p>
                {rate && (
                  <p className="text-xs text-slate-400 mt-1">
                    Rate: ₦{rate.our_rate.toLocaleString("en-NG")} / {currency}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Delivery method cards */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Delivery method</label>
            <div className="space-y-2">
              {activeDeliveryMethods.map(({ value, icon: Icon, label, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDeliveryMethod(value)}
                  className={cn(
                    "w-full flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-colors",
                    deliveryMethod === value
                      ? "border-green-600 bg-green-50"
                      : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  <div className={cn(
                    "size-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                    deliveryMethod === value ? "bg-green-600" : "bg-slate-100"
                  )}>
                    <Icon className={cn("size-4", deliveryMethod === value ? "text-white" : "text-slate-500")} />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-slate-900">{label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Rate lock warning */}
          {RATE_LOCK_CURRENCIES.includes(currency) && (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <Clock className="size-3.5 flex-shrink-0" />
              Rate locked for 15 minutes after payment
            </div>
          )}

          {/* Fee breakdown */}
          {amount >= 1000 && fee > 0 && (
            <div className="text-xs text-slate-500 bg-slate-50 rounded-lg px-4 py-3 space-y-1">
              <div className="flex justify-between">
                <span>Transfer</span>
                <span className="font-medium text-slate-700">₦{amount.toLocaleString("en-NG")}</span>
              </div>
              <div className="flex justify-between">
                <span>Fee</span>
                <span className="font-medium text-slate-700">₦{fee.toLocaleString("en-NG")}</span>
              </div>
              <div className="flex justify-between font-semibold text-slate-900 pt-1 border-t border-slate-200">
                <span>Total</span>
                <span>₦{totalNGN.toLocaleString("en-NG")}</span>
              </div>
            </div>
          )}

          <button
            onClick={() => setStep(2)}
            disabled={!canContinueStep1}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-sm py-3 rounded-xl transition-colors"
          >
            Continue →
          </button>
        </div>
      )}

      {/* ── STEP 2 ──────────────────────────────────── */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-5">
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
                <div className="text-center py-8 text-slate-400">
                  <p className="text-sm mb-2">No saved recipients yet.</p>
                  <button
                    onClick={() => setRecipientTab("new")}
                    className="text-green-700 text-sm font-medium hover:underline"
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
                            ? "border-green-600 bg-green-50"
                            : "border-slate-200 hover:border-slate-300"
                        )}
                      >
                        <div className="size-10 rounded-full bg-slate-100 flex items-center justify-center text-lg flex-shrink-0">
                          {country?.flag ?? "🌍"}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-slate-900">
                            {r.first_name} {r.last_name}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
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
                <div className="rounded-xl border-2 border-green-600 bg-green-50 px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm text-slate-900">
                      {newRecipient.first_name} {newRecipient.last_name}
                    </p>
                    <p className="text-xs text-slate-500">{maskRecipient(newRecipient)}</p>
                  </div>
                  <button
                    onClick={() => setNewRecipient(null)}
                    className="text-xs text-slate-500 hover:text-slate-700 underline"
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
              className="flex-1 border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-sm py-3 rounded-xl transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!canContinueStep2}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-sm py-3 rounded-xl transition-colors"
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3 ──────────────────────────────────── */}
      {step === 3 && recipient && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-5">
          {/* Summary */}
          <div className="rounded-xl bg-slate-50 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">You send</span>
              <span className="font-semibold text-slate-900">₦{amount.toLocaleString("en-NG")}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Recipient gets</span>
              <span className="font-semibold text-green-700 text-lg">
                {rate?.symbol}{converted.toFixed(2)} {currency}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Fee</span>
              <span className="font-medium text-slate-700">₦{fee.toLocaleString("en-NG")}</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 pt-3">
              <span className="text-sm font-semibold text-slate-900">Total deducted</span>
              <span className="font-bold text-slate-900">₦{totalNGN.toLocaleString("en-NG")}</span>
            </div>
          </div>

          {/* Recipient details */}
          <div className="rounded-xl border border-slate-200 p-4 space-y-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Recipient</p>
            <p className="font-semibold text-slate-900">
              {recipient.first_name} {recipient.last_name}
            </p>
            <p className="text-sm text-slate-500">
              {COUNTRIES.find((c) => c.code === recipient.country_code)?.flag}{" "}
              {COUNTRIES.find((c) => c.code === recipient.country_code)?.name} ·{" "}
              {DELIVERY_METHODS.find((m) => m.value === deliveryMethod)?.label}
            </p>
            <p className="text-sm text-slate-500">{maskRecipient(recipient)}</p>
          </div>

          {/* Rate + countdown */}
          <div className="flex items-center justify-between text-sm">
            <div>
              <span className="text-slate-500">Rate used: </span>
              <span className="font-medium text-slate-900">
                ₦{rate?.our_rate.toLocaleString("en-NG")} / {currency}
              </span>
            </div>
            <div className={cn(
              "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full",
              timeLeft > 120 ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
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
              className="size-4 mt-0.5 rounded border-slate-300 accent-green-600"
            />
            <label htmlFor="terms_pay" className="text-sm text-slate-600 cursor-pointer">
              I confirm the recipient details are correct and agree to the{" "}
              <a href="/terms" className="text-green-700 hover:underline">Terms of Service</a>
            </label>
          </div>

          {submitError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {submitError}
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex-1 border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-sm py-3 rounded-xl transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={handlePay}
              disabled={!termsAccepted || submitting || timeLeft === 0}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-sm py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
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
