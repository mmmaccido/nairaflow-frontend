"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { RateCalculator } from "@/components/features/RateCalculator"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { Skeleton } from "@/components/ui/skeleton"
import { ShieldCheck, Lock, Headphones, Building2, Banknote, Truck, Smartphone } from "lucide-react"
import apiClient from "@/lib/api"
import type { Rate } from "@/types/rate"

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Create your account",
    desc: "Sign up in 2 minutes. No paperwork, no branch visits — just your email and phone.",
  },
  {
    step: "02",
    title: "Enter transfer details",
    desc: "Choose your recipient, amount, and preferred delivery method. We show the rate upfront.",
  },
  {
    step: "03",
    title: "Money arrives fast",
    desc: "Your recipient gets funds directly to their bank or mobile wallet — often within minutes.",
  },
]

const DELIVERY_METHODS = [
  {
    icon: Building2,
    title: "Bank Wire",
    desc: "Direct to any international bank account. Arrives in 1–2 business days.",
    badge: "Most popular",
  },
  {
    icon: Banknote,
    title: "NGN Bank Transfer",
    desc: "Send naira directly to a Nigerian bank. Instant settlement.",
    badge: "Instant",
  },
  {
    icon: Truck,
    title: "Cash Delivery",
    desc: "Agent network delivery in select countries. Same-day in major cities.",
    badge: "Same day",
  },
  {
    icon: Smartphone,
    title: "Mobile Money",
    desc: "Send directly to M-Pesa, MTN MoMo, and other mobile wallets.",
    badge: "Instant",
  },
]

const TRUST_POINTS = [
  {
    icon: ShieldCheck,
    title: "CBN Licensed",
    desc: "Fully regulated by the Central Bank of Nigeria as a licensed Bureau De Change operator.",
  },
  {
    icon: Lock,
    title: "256-bit Encryption",
    desc: "Bank-grade TLS encryption protects every transfer and personal detail you share with us.",
  },
  {
    icon: Headphones,
    title: "24/7 Support",
    desc: "Real humans available around the clock via chat, email, and phone — wherever you are.",
  },
]

const TESTIMONIALS = [
  {
    quote: "I've been sending money to my parents in Lagos for years. NairaFlow gave me the best rate I've ever seen.",
    name: "Chidi Okafor",
    location: "London, UK",
  },
  {
    quote: "Setup took 3 minutes, my first transfer was done before I finished my tea. Absolutely seamless.",
    name: "Amara Nwosu",
    location: "Toronto, Canada",
  },
  {
    quote: "The live rate calculator is a game-changer. I know exactly what my recipient gets before I confirm.",
    name: "Fatima Bello",
    location: "Dubai, UAE",
  },
]

const FAQ = [
  {
    q: "How long does a transfer take?",
    a: "Bank transfers typically arrive within 1–2 business days. Mobile money and NGN bank transfers are usually instant. You'll see the estimated delivery time before confirming.",
  },
  {
    q: "What are the fees?",
    a: "We charge a small flat fee starting from ₦500, plus a competitive spread on the exchange rate. You'll always see the exact cost before you confirm — no surprises.",
  },
  {
    q: "Which countries do you support?",
    a: "We currently support transfers to 50+ countries including the US, UK, Canada, EU, Australia, Ghana, South Africa, and Turkey. More destinations are added regularly.",
  },
  {
    q: "Is my money safe?",
    a: "Yes. NairaFlow is licensed by the Central Bank of Nigeria. All funds are held in segregated accounts and protected by 256-bit bank-grade encryption.",
  },
  {
    q: "How do I verify my identity?",
    a: "After registration, visit the KYC section in your dashboard. You'll need a valid government-issued ID and a recent utility bill or bank statement. Verification takes 1–24 hours.",
  },
  {
    q: "What is the minimum transfer amount?",
    a: "The minimum transfer is ₦10,000. There is currently no maximum, though large transfers may require additional documentation as per CBN regulations.",
  },
]

function CurrenciesGrid() {
  const [rates, setRates] = useState<Rate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient
      .get<{ rates: Rate[]; count: number }>("/rates")
      .then((r) => setRates(r.data.rates ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="py-16 px-4 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold font-sora text-slate-900 mb-3">Live exchange rates</h2>
          <p className="text-slate-500 text-sm">Rates updated every 60 seconds. What you see is what your recipient gets.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 space-y-3">
                  <Skeleton className="h-6 w-10" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              ))
            : rates.map((rate) => (
                <div key={rate.currency} className="bg-white rounded-2xl p-5 border border-slate-100 hover:shadow-md transition-shadow">
                  <p className="text-2xl mb-1">{rate.flag}</p>
                  <p className="font-semibold text-slate-900 text-sm">{rate.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ₦1,000 ={" "}
                    <span className="font-medium text-slate-700">
                      {rate.symbol}
                      {(1000 / rate.our_rate).toFixed(2)}
                    </span>{" "}
                    {rate.currency}
                  </p>
                  <span className="mt-2 inline-block text-xs font-medium bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                    {rate.speed}
                  </span>
                </div>
              ))}
        </div>
      </div>
    </section>
  )
}

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="bg-slate-950 text-white py-20 px-4">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-green-900/50 text-green-400 text-xs font-medium px-3 py-1.5 rounded-full mb-6 border border-green-800">
                <span className="size-1.5 rounded-full bg-green-400 animate-pulse" />
                Live rates updated every 60 seconds
              </div>
              <h1 className="text-4xl md:text-5xl font-bold font-sora leading-tight mb-5">
                Send money abroad,
                <br />
                <span className="text-green-400">the smart way</span>
              </h1>
              <p className="text-slate-300 text-lg mb-10 leading-relaxed">
                Fast, low-cost transfers from Nigeria to 50+ countries. Transparent rates, instant delivery, zero surprises.
              </p>
              {/* Trust stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { value: "₦0", label: "Hidden fees" },
                  { value: "50+", label: "Countries" },
                  { value: "2 min", label: "Avg. setup" },
                  { value: "24/7", label: "Support" },
                ].map(({ value, label }) => (
                  <div key={label}>
                    <p className="text-2xl font-bold font-sora text-green-400">{value}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <RateCalculator dark />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-16 px-4 bg-white">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold font-sora text-slate-900 mb-3">How it works</h2>
              <p className="text-slate-500 text-sm">Three steps. That&apos;s it.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 relative">
              <div className="hidden md:block absolute top-6 left-[calc(16.67%+1.5rem)] right-[calc(16.67%+1.5rem)] h-px bg-slate-200" />
              {HOW_IT_WORKS.map(({ step, title, desc }) => (
                <div key={step} className="text-center relative">
                  <div className="size-12 rounded-full bg-green-50 border-2 border-green-100 flex items-center justify-center mx-auto mb-4 relative z-10 bg-white">
                    <span className="text-green-700 font-bold font-sora text-sm">{step}</span>
                  </div>
                  <h3 className="font-semibold font-sora text-slate-900 mb-2">{title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Live rates */}
        <CurrenciesGrid />

        {/* Delivery methods */}
        <section className="py-16 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold font-sora text-slate-900 mb-3">Delivery methods</h2>
              <p className="text-slate-500 text-sm">Choose how your recipient gets paid.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {DELIVERY_METHODS.map(({ icon: Icon, title, desc, badge }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-slate-100 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="size-10 rounded-xl bg-green-50 flex items-center justify-center mb-4">
                    <Icon className="size-5 text-green-600" />
                  </div>
                  <h3 className="font-semibold font-sora text-slate-900 mb-1.5">{title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed mb-3">{desc}</p>
                  <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    {badge}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust */}
        <section className="py-16 px-4 bg-slate-50">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold font-sora text-slate-900 mb-3">Your money is safe with us</h2>
              <p className="text-slate-500 text-sm">Built on compliance, secured by design.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {TRUST_POINTS.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex gap-4">
                  <div className="size-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="size-5 text-green-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold font-sora text-slate-900 mb-1">{title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-16 px-4 bg-white">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold font-sora text-slate-900 mb-3">Trusted by Nigerians worldwide</h2>
              <p className="text-slate-500 text-sm">Join thousands of customers who send with confidence.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {TESTIMONIALS.map(({ quote, name, location }) => (
                <div
                  key={name}
                  className="rounded-2xl border border-slate-100 p-6 bg-slate-50"
                >
                  <p className="text-slate-600 text-sm leading-relaxed mb-5">&ldquo;{quote}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="text-green-700 font-semibold text-xs">
                        {name.split(" ").map((n) => n[0]).join("")}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{name}</p>
                      <p className="text-xs text-slate-500">{location}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 px-4 bg-slate-50">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold font-sora text-slate-900 mb-3">Frequently asked questions</h2>
              <p className="text-slate-500 text-sm">Everything you need to know before your first transfer.</p>
            </div>
            <Accordion>
              {FAQ.map(({ q, a }, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left text-slate-900 font-medium">{q}</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-slate-600 text-sm leading-relaxed">{a}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-4 bg-slate-950 text-white text-center">
          <div className="max-w-xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold font-sora mb-4">
              Ready to send your first transfer?
            </h2>
            <p className="text-slate-300 text-base mb-8">
              Create a free account in 2 minutes. No hidden fees. No surprises.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/register"
                className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-3 rounded-xl transition-colors text-sm"
              >
                Create free account
              </Link>
              <Link
                href="#rates"
                onClick={(e) => {
                  e.preventDefault()
                  document.querySelector("[data-section='rates']")?.scrollIntoView({ behavior: "smooth" })
                }}
                className="inline-block border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold px-8 py-3 rounded-xl transition-colors text-sm"
              >
                See live rates
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
