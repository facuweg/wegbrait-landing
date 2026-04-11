import { MessageCircle } from 'lucide-react'
import { cn } from "@/lib/utils"

type MessageBubbleProps = {
  text?: string
  side?: "left" | "right"
}

export default function MessageBubble({
  text = "Sample message about a recent social interaction.",
  side = "left",
}: MessageBubbleProps) {
  const isLeft = side === "left"
  return (
    <div
      className={cn(
        "max-w-[85%] sm:max-w-[70%] rounded-2xl border shadow-sm px-3.5 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-[0.95rem] leading-relaxed",
        "transition-colors",
        isLeft
          ? "bg-white border-neutral-200 text-neutral-900"
          : "bg-emerald-50 border-emerald-100 text-emerald-900"
      )}
      role="group"
      aria-label={isLeft ? "Contact update" : "New interaction"}
    >
      <div className="flex items-start gap-2">
        <div
          className={cn(
            "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
            isLeft ? "border-neutral-200 bg-white text-neutral-500" : "border-emerald-100 bg-emerald-100 text-emerald-700"
          )}
          aria-hidden="true"
        >
          <MessageCircle className="h-3.5 w-3.5" />
        </div>
        <p className="flex-1">{text}</p>
      </div>
    </div>
  )
}
