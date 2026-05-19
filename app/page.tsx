import Link from "next/link"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col items-center justify-center min-h-[calc(100vh-4rem-14rem)] bg-slate-50">
        <div className="text-center space-y-6 px-4">
          <h1 className="text-4xl font-bold font-sora text-slate-900">NairaFlow</h1>
          <p className="text-xl text-slate-500">Fast, affordable transfers from Nigeria to the world.</p>
          <p className="text-slate-400 italic">Coming soon.</p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/login"
              className="inline-block rounded-lg border border-slate-300 px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="inline-block rounded-lg bg-green-600 px-6 py-3 text-sm font-medium text-white hover:bg-green-700 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
