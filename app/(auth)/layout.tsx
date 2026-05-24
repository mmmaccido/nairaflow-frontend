import Link from "next/link"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-bone p-4">
      <div className="mb-8">
        <Link href="/" className="flex items-center gap-2 justify-center">
          <div className="size-9 rounded-full bg-emerald flex items-center justify-center">
            <span className="text-bone font-bold font-display">N</span>
          </div>
          <span className="text-ink font-semibold text-xl font-display">NairaFlow</span>
        </Link>
      </div>
      {children}
    </main>
  )
}