import { Fragment } from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface StepIndicatorProps {
  steps: string[]
  current: number // 1-indexed
}

export function StepIndicator({ steps, current }: StepIndicatorProps) {
  return (
    <div className="flex items-center mb-8">
      {steps.map((label, i) => {
        const n = i + 1
        const done = n < current
        const active = n === current
        return (
          <Fragment key={n}>
            <div className="flex-1 min-w-0 flex flex-col items-center">
              <div
                className={cn(
                  "size-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all",
                  done || active
                    ? "bg-emerald border-emerald text-bone"
                    : "bg-paper border-bone-deep text-muted-text"
                )}
              >
                {done ? <Check className="size-4 stroke-[2.5]" /> : n}
              </div>
              <p
                className={cn(
                  "text-xs mt-1.5 font-medium text-center break-words w-full px-1",
                  active ? "text-emerald" : done ? "text-emerald-light" : "text-muted-text"
                )}
              >
                {label}
              </p>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "w-6 sm:w-10 flex-shrink-0 h-0.5 mb-5",
                  n < current ? "bg-emerald" : "bg-bone-deep"
                )}
              />
            )}
          </Fragment>
        )
      })}
    </div>
  )
}
