import { AlertTriangle } from "lucide-react"

export function ErrorAlert({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-4 flex items-start gap-3">
      <AlertTriangle className="size-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-800">{message}</p>
        <button
          onClick={onRetry}
          className="mt-2 text-xs font-semibold text-amber-800 hover:text-amber-900 underline underline-offset-2"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
