"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"
import apiClient from "@/lib/api"
import { handleApiError } from "@/lib/handleApiError"
import type { Recipient } from "@/types/recipient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type CountryGroup = "US" | "CA" | "GB" | "SEPA" | "AU" | "GH" | "ZA" | "NG"

export const COUNTRIES = [
  { code: "US", flag: "🇺🇸", name: "United States", group: "US" as CountryGroup },
  { code: "CA", flag: "🇨🇦", name: "Canada", group: "CA" as CountryGroup },
  { code: "GB", flag: "🇬🇧", name: "United Kingdom", group: "GB" as CountryGroup },
  { code: "DE", flag: "🇩🇪", name: "Germany", group: "SEPA" as CountryGroup },
  { code: "FR", flag: "🇫🇷", name: "France", group: "SEPA" as CountryGroup },
  { code: "NL", flag: "🇳🇱", name: "Netherlands", group: "SEPA" as CountryGroup },
  { code: "BE", flag: "🇧🇪", name: "Belgium", group: "SEPA" as CountryGroup },
  { code: "ES", flag: "🇪🇸", name: "Spain", group: "SEPA" as CountryGroup },
  { code: "IT", flag: "🇮🇹", name: "Italy", group: "SEPA" as CountryGroup },
  { code: "AT", flag: "🇦🇹", name: "Austria", group: "SEPA" as CountryGroup },
  { code: "PT", flag: "🇵🇹", name: "Portugal", group: "SEPA" as CountryGroup },
  { code: "CH", flag: "🇨🇭", name: "Switzerland", group: "SEPA" as CountryGroup },
  { code: "TR", flag: "🇹🇷", name: "Turkey", group: "SEPA" as CountryGroup },
  { code: "AU", flag: "🇦🇺", name: "Australia", group: "AU" as CountryGroup },
  { code: "GH", flag: "🇬🇭", name: "Ghana", group: "GH" as CountryGroup },
  { code: "ZA", flag: "🇿🇦", name: "South Africa", group: "ZA" as CountryGroup },
  { code: "NG", flag: "🇳🇬", name: "Nigeria", group: "NG" as CountryGroup },
]

export const CURRENCY_TO_COUNTRY: Record<string, string> = {
  USD: "US", CAD: "CA", GBP: "GB", EUR: "DE",
  TRY: "TR", AUD: "AU", GHS: "GH", ZAR: "ZA", NGN: "NG",
}

export function getCountryGroup(code: string): CountryGroup {
  return COUNTRIES.find((c) => c.code === code)?.group ?? "SEPA"
}

const schema = z
  .object({
    country_code: z.string().min(2, { error: "Select a country" }),
    first_name: z.string().min(1, { error: "First name required" }),
    last_name: z.string().min(1, { error: "Last name required" }),
    email: z.string().optional(),
    accountNumber: z.string().optional(),
    routingNumber: z.string().optional(),
    transitNumber: z.string().optional(),
    institutionNumber: z.string().optional(),
    sortCode: z.string().optional(),
    iban: z.string().optional(),
    bic: z.string().optional(),
    bsb: z.string().optional(),
    branchCode: z.string().optional(),
    provider: z.string().optional(),
    mobileNumber: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const group = getCountryGroup(data.country_code)
    const req = (field: string, val: string | undefined, msg: string) => {
      if (!val?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: msg })
    }
    const fmt = (field: string, val: string | undefined, re: RegExp, msg: string) => {
      if (val?.trim() && !re.test(val)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: msg })
    }

    if (group === "US") {
      req("accountNumber", data.accountNumber, "Account number required")
      fmt("accountNumber", data.accountNumber, /^\d{4,17}$/, "Must be 4–17 digits")
      req("routingNumber", data.routingNumber, "Routing number required")
      fmt("routingNumber", data.routingNumber, /^\d{9}$/, "Must be exactly 9 digits")
    }
    if (group === "CA") {
      req("accountNumber", data.accountNumber, "Account number required")
      req("transitNumber", data.transitNumber, "Transit number required")
      fmt("transitNumber", data.transitNumber, /^\d{5}$/, "Must be exactly 5 digits")
      req("institutionNumber", data.institutionNumber, "Institution number required")
      fmt("institutionNumber", data.institutionNumber, /^\d{3}$/, "Must be exactly 3 digits")
    }
    if (group === "GB") {
      req("accountNumber", data.accountNumber, "Account number required")
      fmt("accountNumber", data.accountNumber, /^\d{8}$/, "Must be exactly 8 digits")
      req("sortCode", data.sortCode, "Sort code required")
      fmt("sortCode", data.sortCode, /^\d{2}-\d{2}-\d{2}$/, "Format: XX-XX-XX")
    }
    if (group === "SEPA") {
      req("iban", data.iban, "IBAN required")
      if (data.iban?.trim()) {
        const clean = data.iban.replace(/\s/g, "").toUpperCase()
        if (!/^[A-Z]{2}[0-9A-Z]{13,32}$/.test(clean)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["iban"], message: "Must start with 2-letter country code, 15–34 chars total" })
        }
      }
      if (data.bic?.trim() && !/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(data.bic)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["bic"], message: "Invalid BIC/SWIFT format" })
      }
    }
    if (group === "AU") {
      req("accountNumber", data.accountNumber, "Account number required")
      req("bsb", data.bsb, "BSB required")
      fmt("bsb", data.bsb, /^\d{6}$/, "Must be exactly 6 digits")
    }
    if (group === "ZA") {
      req("accountNumber", data.accountNumber, "Account number required")
      req("branchCode", data.branchCode, "Branch code required")
      fmt("branchCode", data.branchCode, /^\d{6}$/, "Must be exactly 6 digits")
    }
    if (group === "GH") {
      req("provider", data.provider, "Select a provider")
      req("mobileNumber", data.mobileNumber, "Mobile number required")
      fmt("mobileNumber", data.mobileNumber, /^\d{10}$/, "Must be 10 digits")
    }
    if (group === "NG") {
      req("phone", data.phone, "Phone number required")
      req("address", data.address, "Address required")
      req("city", data.city, "City required")
    }
  })

type FormValues = z.infer<typeof schema>

interface RecipientFormProps {
  defaultCountry?: string
  onSuccess: (recipient: Recipient) => void
  noSave?: boolean
  submitLabel?: string
  defaultValues?: Partial<Recipient>
  recipientId?: string
}

export function RecipientForm({
  defaultCountry,
  onSuccess,
  noSave = false,
  submitLabel = "Save recipient →",
  defaultValues: dv,
  recipientId,
}: RecipientFormProps) {
  const [serverError, setServerError] = useState("")

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      country_code: dv?.country_code ?? defaultCountry ?? "",
      first_name: dv?.first_name ?? "",
      last_name: dv?.last_name ?? "",
      email: "",
      ...(dv?.bank_details ?? {}),
    },
    mode: "onBlur",
  })

  const countryCode = watch("country_code")
  const group = getCountryGroup(countryCode)
  const countryMeta = COUNTRIES.find((c) => c.code === countryCode)

  function handleSortCodeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 6)
    let formatted = digits
    if (digits.length > 4) formatted = `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`
    else if (digits.length > 2) formatted = `${digits.slice(0, 2)}-${digits.slice(2)}`
    setValue("sortCode", formatted, { shouldValidate: true, shouldDirty: true })
  }

  function handleIbanChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue("iban", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""), {
      shouldValidate: true,
      shouldDirty: true,
    })
  }

  async function onSubmit(data: FormValues) {
    setServerError("")
    const group = getCountryGroup(data.country_code)

    const bank_details: Record<string, string> = {}
    if (group === "US") {
      bank_details.accountNumber = data.accountNumber!
      bank_details.routingNumber = data.routingNumber!
    } else if (group === "CA") {
      bank_details.accountNumber = data.accountNumber!
      bank_details.transitNumber = data.transitNumber!
      bank_details.institutionNumber = data.institutionNumber!
    } else if (group === "GB") {
      bank_details.accountNumber = data.accountNumber!
      bank_details.sortCode = data.sortCode!
    } else if (group === "SEPA") {
      bank_details.iban = data.iban!.replace(/\s/g, "").toUpperCase()
      if (data.bic) bank_details.bic = data.bic.toUpperCase()
    } else if (group === "AU") {
      bank_details.accountNumber = data.accountNumber!
      bank_details.bsb = data.bsb!
    } else if (group === "ZA") {
      bank_details.accountNumber = data.accountNumber!
      bank_details.branchCode = data.branchCode!
    } else if (group === "GH") {
      bank_details.provider = data.provider!
      bank_details.mobileNumber = data.mobileNumber!
    } else if (group === "NG") {
      bank_details.phone = data.phone!
      bank_details.address = data.address!
      bank_details.city = data.city!
    }

    const payload = {
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email || undefined,
      country_code: data.country_code,
      currency: getCurrencyForCountry(data.country_code),
      delivery_type: getDeliveryTypeForGroup(group),
      bank_details,
    }

    if (noSave) {
      onSuccess({ ...payload, id: "", user_id: "", deleted_at: null, created_at: "", updated_at: "", bank_details } as Recipient)
      return
    }

    try {
      const res = recipientId
        ? await apiClient.put<Recipient>(`/recipients/${recipientId}`, payload)
        : await apiClient.post<Recipient>("/recipients", payload)
      onSuccess(res.data)
    } catch (err) {
      setServerError(handleApiError(err))
    }
  }

  const err = (field: keyof FormValues) =>
    errors[field]?.message ? (
      <p className="text-xs text-red-600 mt-0.5">{errors[field]!.message}</p>
    ) : null

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {serverError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {serverError}
        </p>
      )}

      {/* Country selector */}
      <div>
        <Label className="mb-1.5 block">Country</Label>
        <Select
          value={countryCode}
          onValueChange={(v) => v && setValue("country_code", v, { shouldValidate: true })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select country">
              {countryMeta ? `${countryMeta.flag} ${countryMeta.name}` : undefined}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map(({ code, flag, name }) => (
              <SelectItem key={code} value={code}>
                {flag} {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {err("country_code")}
      </div>

      {/* Personal details — always shown */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="rf_first" className="mb-1.5 block">First name</Label>
          <Input id="rf_first" placeholder="John" {...register("first_name")} />
          {err("first_name")}
        </div>
        <div>
          <Label htmlFor="rf_last" className="mb-1.5 block">Last name</Label>
          <Input id="rf_last" placeholder="Doe" {...register("last_name")} />
          {err("last_name")}
        </div>
      </div>

      <div>
        <Label htmlFor="rf_email" className="mb-1.5 block">Email <span className="text-slate-400 font-normal">(optional)</span></Label>
        <Input id="rf_email" type="email" placeholder="john@example.com" {...register("email")} />
        {err("email")}
      </div>

      {/* Country-specific bank fields */}
      {countryCode && (
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Bank details</p>

          {/* US */}
          {group === "US" && (
            <>
              <div>
                <Label className="mb-1.5 block">Account number</Label>
                <Input type="text" inputMode="numeric" placeholder="4–17 digits" {...register("accountNumber")} />
                {err("accountNumber")}
              </div>
              <div>
                <Label className="mb-1.5 block">
                  Routing number
                  <span className="text-slate-400 font-normal ml-1 text-xs">(9-digit number on bottom of check)</span>
                </Label>
                <Input type="text" inputMode="numeric" maxLength={9} placeholder="123456789" {...register("routingNumber")} />
                {err("routingNumber")}
              </div>
            </>
          )}

          {/* CA */}
          {group === "CA" && (
            <>
              <div>
                <Label className="mb-1.5 block">Account number</Label>
                <Input type="text" inputMode="numeric" {...register("accountNumber")} />
                {err("accountNumber")}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5 block">Transit number <span className="text-slate-400 font-normal text-xs">(5 digits)</span></Label>
                  <Input type="text" inputMode="numeric" maxLength={5} {...register("transitNumber")} />
                  {err("transitNumber")}
                </div>
                <div>
                  <Label className="mb-1.5 block">Institution number <span className="text-slate-400 font-normal text-xs">(3 digits)</span></Label>
                  <Input type="text" inputMode="numeric" maxLength={3} {...register("institutionNumber")} />
                  {err("institutionNumber")}
                </div>
              </div>
            </>
          )}

          {/* GB */}
          {group === "GB" && (
            <>
              <div>
                <Label className="mb-1.5 block">Account number <span className="text-slate-400 font-normal text-xs">(8 digits)</span></Label>
                <Input type="text" inputMode="numeric" maxLength={8} {...register("accountNumber")} />
                {err("accountNumber")}
              </div>
              <div>
                <Label className="mb-1.5 block">Sort code <span className="text-slate-400 font-normal text-xs">(XX-XX-XX)</span></Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="12-34-56"
                  value={watch("sortCode") ?? ""}
                  onChange={handleSortCodeChange}
                />
                {err("sortCode")}
              </div>
            </>
          )}

          {/* SEPA (EU / TR / others) */}
          {group === "SEPA" && (
            <>
              <div>
                <Label className="mb-1.5 block">IBAN <span className="text-slate-400 font-normal text-xs">(starts with 2-letter country code)</span></Label>
                <Input
                  type="text"
                  placeholder="DE89370400440532013000"
                  value={watch("iban") ?? ""}
                  onChange={handleIbanChange}
                />
                {err("iban")}
              </div>
              <div>
                <Label className="mb-1.5 block">BIC / SWIFT <span className="text-slate-400 font-normal">(optional)</span></Label>
                <Input type="text" placeholder="DEUTDEDB" {...register("bic")} onChange={(e) => setValue("bic", e.target.value.toUpperCase())} />
                {err("bic")}
              </div>
            </>
          )}

          {/* AU */}
          {group === "AU" && (
            <>
              <div>
                <Label className="mb-1.5 block">Account number</Label>
                <Input type="text" inputMode="numeric" {...register("accountNumber")} />
                {err("accountNumber")}
              </div>
              <div>
                <Label className="mb-1.5 block">BSB <span className="text-slate-400 font-normal text-xs">(6 digits)</span></Label>
                <Input type="text" inputMode="numeric" maxLength={6} placeholder="063000" {...register("bsb")} />
                {err("bsb")}
              </div>
            </>
          )}

          {/* ZA */}
          {group === "ZA" && (
            <>
              <div>
                <Label className="mb-1.5 block">Account number</Label>
                <Input type="text" inputMode="numeric" {...register("accountNumber")} />
                {err("accountNumber")}
              </div>
              <div>
                <Label className="mb-1.5 block">Branch code <span className="text-slate-400 font-normal text-xs">(6 digits)</span></Label>
                <Input type="text" inputMode="numeric" maxLength={6} {...register("branchCode")} />
                {err("branchCode")}
              </div>
            </>
          )}

          {/* GH — Mobile Money */}
          {group === "GH" && (
            <>
              <div>
                <Label className="mb-1.5 block">Mobile money provider</Label>
                <Select
                  value={watch("provider") ?? ""}
                  onValueChange={(v) => v && setValue("provider", v, { shouldValidate: true })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MTN">MTN Mobile Money</SelectItem>
                    <SelectItem value="Vodafone">Vodafone Cash</SelectItem>
                    <SelectItem value="AirtelTigo">AirtelTigo Money</SelectItem>
                  </SelectContent>
                </Select>
                {err("provider")}
              </div>
              <div>
                <Label className="mb-1.5 block">Mobile number <span className="text-slate-400 font-normal text-xs">(10 digits)</span></Label>
                <Input type="text" inputMode="numeric" maxLength={10} {...register("mobileNumber")} />
                {err("mobileNumber")}
              </div>
            </>
          )}

          {/* NG — Cash Delivery */}
          {group === "NG" && (
            <>
              <div>
                <Label className="mb-1.5 block">Phone number</Label>
                <Input type="tel" placeholder="+234..." {...register("phone")} />
                {err("phone")}
              </div>
              <div>
                <Label className="mb-1.5 block">Address</Label>
                <Input type="text" placeholder="123 Adeola Street" {...register("address")} />
                {err("address")}
              </div>
              <div>
                <Label className="mb-1.5 block">City</Label>
                <Input type="text" placeholder="Lagos" {...register("city")} />
                {err("city")}
              </div>
            </>
          )}
        </div>
      )}

      <Button
        type="submit"
        disabled={isSubmitting || !countryCode}
        className="w-full bg-green-600 hover:bg-green-700 text-white mt-2"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="size-4 animate-spin mr-2" />
            Saving…
          </>
        ) : (
          submitLabel
        )}
      </Button>
    </form>
  )
}

function getCurrencyForCountry(code: string): string {
  const map: Record<string, string> = {
    US: "USD", CA: "CAD", GB: "GBP",
    DE: "EUR", FR: "EUR", NL: "EUR", BE: "EUR",
    ES: "EUR", IT: "EUR", AT: "EUR", PT: "EUR", CH: "CHF",
    TR: "TRY", AU: "AUD", GH: "GHS", ZA: "ZAR", NG: "NGN",
  }
  return map[code] ?? "USD"
}

function getDeliveryTypeForGroup(group: CountryGroup): string {
  const map: Record<CountryGroup, string> = {
    US: "BANK_WIRE", CA: "BANK_WIRE", GB: "BANK_WIRE",
    SEPA: "BANK_WIRE", AU: "BANK_WIRE", ZA: "BANK_WIRE",
    GH: "MOBILE_MONEY", NG: "CASH_PICKUP",
  }
  return map[group]
}
