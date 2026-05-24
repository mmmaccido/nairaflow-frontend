import { DashboardSidebar } from "@/components/layout/DashboardSidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-bone">
      <DashboardSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 pt-16 md:pt-6 max-w-5xl">{children}</div>
      </main>
    </div>
  )
}