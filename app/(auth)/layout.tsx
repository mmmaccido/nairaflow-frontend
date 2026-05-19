import Link from "next/link"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <div className="mb-8">
        <Link href="/" className="flex items-center gap-2 justify-center">
          <div className="size-9 rounded-full bg-green-600 flex items-center justify-center">
            <span className="text-white font-bold font-sora">N</span>
          </div>
          <span className="text-slate-900 font-semibold text-xl font-sora">NairaFlow</span>
        </Link>
      </div>
      {children}
    </main>
  )
}
