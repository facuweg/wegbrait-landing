'use client'

import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import MessageBubble from "./message-bubble"

type ConversationFeedProps = {
  messages?: string[]
  intervalMs?: number
  maxVisible?: number
}

const DEFAULT_MESSAGES: string[] = [
  // Provided examples
  "I met with John D. and he told me about his desire to raise funds for his fintech startup.",
  "I met with Catalina S. She is looking to purchase land in Patagonia for an agriculture venture.",
  // Additional social interactions
  "Grabbed coffee with Priya R.; she’s exploring mentors for her AI safety reading group.",
  "Chatted with Marcus T. who’s organizing a climate hackathon in Berlin this fall.",
  "Call with Aiko K.; she wants intros to founders building privacy‑first messaging tools.",
  "Breakfast with Leo C. about partnering on a community coworking space in Lisbon.",
  "Met with Sofia V.; she’s raising a seed round for a circular fashion marketplace.",
  "Quick sync with Daniel M. on sponsoring an open‑source ML observability project.",
  "Walked with Elena F.; she’s searching for a cofounder for a mental health app.",
  "Met Omar B.; he wants to host a monthly founder salon around synthetic biology.",
  "Coffee with Nina P.; she’s hiring a head of ops for her robotics company.",
  "Discussed with Arjun S. his plan to launch a newsletter on urban design.",
  "Had lunch with Mei L.; she’s seeking farmland financing options in Oaxaca.",
  "Talked to Victor H.; he’s coordinating volunteers for a local civic tech group.",
  "Met with Clara J.; she’s interested in joining a fund as an investment partner.",
  "Zoom with Tom W.; he’s building a platform for artist residencies in rural towns.",
  "Checked in with Zahra Q.; she’s organizing a women‑in‑data meetup series.",
  "Met with Ben R.; he’s looking for beta testers for an on‑device voice model.",
  "Chat with Julia G.; she’s exploring impact investments in regenerative ag.",
  "Coffee with Sam P.; he’s evaluating accelerators for a bioinformatics tool.",
  "Spoke with Hana D.; she’s planning a micro‑grant program for student founders.",
  "Met with Diego F.; he’s scouting venues for an indie research retreat.",
  "Quick call with Iris K.; she’s looking to acquire a small SaaS in edtech.",
  "Breakfast with Omar A.; he wants intros to LPs focused on climate.",
  "Caught up with Mateo R.; he’s piloting a neighborhood time‑bank.",
]

export default function ConversationFeed({
  messages = DEFAULT_MESSAGES,
  intervalMs = 2200,
  maxVisible = 8,
}: ConversationFeedProps) {
  // Shuffle once to create a natural sequence each mount
  const sequence = useMemo(() => {
    const copy = [...messages]
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
  }, [messages])

  const [visible, setVisible] = useState<{ id: string; text: string; side: "left" | "right" }[]>(() =>
    sequence.slice(0, Math.min(maxVisible, sequence.length)).map((text, i) => ({
      id: `init-${i}`,
      text,
      side: i % 2 === 0 ? "left" : "right",
    }))
  )
  const cursorRef = useRef(Math.min(maxVisible, sequence.length))

  useEffect(() => {
    const timer = setInterval(() => {
      const idx = cursorRef.current % sequence.length
      const text = sequence[idx]
      const side = idx % 2 === 0 ? "left" : "right"
      const next = { id: `msg-${Date.now()}-${idx}`, text, side }

      setVisible((prev) => {
        const combined = [...prev, next]
        const start = Math.max(0, combined.length - maxVisible)
        return combined.slice(start)
      })

      cursorRef.current += 1
    }, intervalMs)

    return () => clearInterval(timer)
  }, [sequence, intervalMs, maxVisible])

  return (
    <div className="relative">
      {/* Chat viewport */}
      <div
        className="h-[520px] sm:h-[600px] w-full overflow-hidden rounded-xl border bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/50 p-3 sm:p-4"
        aria-label="Live conversation feed"
      >
        <ul
          aria-live="polite"
          className="flex h-full flex-col justify-end gap-2 sm:gap-3"
        >
          <AnimatePresence initial={false}>
            {visible.map((m) => (
              <motion.li
                key={m.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.98 }}
                transition={{ type: "spring", damping: 24, stiffness: 260, mass: 0.7 }}
                className={m.side === "left" ? "self-start" : "self-end"}
              >
                <MessageBubble text={m.text} side={m.side} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </div>

      {/* Top fade to suggest scrollback */}
      <div className="pointer-events-none absolute inset-x-3 sm:inset-x-4 top-[6px] h-16 bg-gradient-to-b from-background to-transparent rounded-t-xl" />
    </div>
  )
}
