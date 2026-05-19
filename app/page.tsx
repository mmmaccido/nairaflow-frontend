import Link from "next/link"

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center min-h-screen bg-slate-50">
      <div className="text-center space-y-6 px-4">
        <h1 className="text-4xl font-bold font-sora text-slate-900">NairaFlow</h1>
        <p className="text-xl text-slate-500">Fast, affordable transfers from Nigeria to the world.</p>
        <p className="text-slate-400 italic">Coming soon.</p>
        <Link
          href="/login"
          className="inline-block rounded-lg bg-slate-900 px-6 py-3 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
        >
          Sign in
        </Link>
      </div>
    </main>
  )
}
