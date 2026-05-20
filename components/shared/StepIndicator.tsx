import { Fragment } from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface StepIndicatorProps {
  steps: string[]
  current: number // 1-indexed
}

export function StepIndicator({ steps, current }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((label, i) => {
        const n = i + 1
        const done = n < current
        const active = n === current
        return (
          <Fragment key={n}>
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "size-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all",
                  done || active
                    ? "bg-green-600 border-green-600 text-white"
                    : "bg-white border-slate-300 text-slate-400"
                )}
              >
                {done ? <Check className="size-4 stroke-[2.5]" /> : n}
              </div>
              <p
                className={cn(
                  "text-xs mt-1.5 font-medium text-center whitespace-nowrap",
                  active ? "text-green-700" : done ? "text-green-600" : "text-slate-400"
                )}
              >
                {label}
              </p>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-2 mb-5 min-w-8",
                  n < current ? "bg-green-600" : "bg-slate-200"
                )}
              />
            )}
          </Fragment>
        )
      })}
    </div>
  )
}
