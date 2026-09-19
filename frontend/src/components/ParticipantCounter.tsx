import { Eye, CheckCircle2, Users } from 'lucide-react'

interface Props {
  viewers: number
  voted: number
  observing?: number
  className?: string
  compact?: boolean
}

/**
 * ParticipantCounter displays real-time audience presence tracking.
 * Driven by Redis WebSocket connection counters.
 * Example display: "24 viewing • 18 voted • 6 observing"
 */
export default function ParticipantCounter({
  viewers = 0,
  voted = 0,
  observing,
  className = '',
  compact = false,
}: Props) {
  const safeViewers = Math.max(viewers, voted, 1)
  const safeVoted = Math.max(voted, 0)
  const safeObserving = observing !== undefined ? Math.max(observing, 0) : Math.max(0, safeViewers - safeVoted)

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs text-slate-300 shadow-sm backdrop-blur-sm ${className}`}>
        <span className="flex items-center gap-1.5 font-medium text-emerald-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          {safeViewers.toLocaleString()} viewing
        </span>
        <span className="text-slate-600">•</span>
        <span className="text-violet-300 font-medium">
          {safeVoted.toLocaleString()} voted
        </span>
        <span className="text-slate-600">•</span>
        <span className="text-slate-400">
          {safeObserving.toLocaleString()} observing
        </span>
      </div>
    )
  }

  return (
    <div className={`grid grid-cols-3 gap-2 sm:gap-2.5 p-2 rounded-xl bg-slate-900/80 border border-slate-800/80 shadow-sm backdrop-blur-sm shrink-0 ${className}`}>
      {/* Viewers */}
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-950/50 border border-slate-800/50">
        <div className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 shrink-0">
          <Users size={14} />
          <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Viewing</p>
          <p className="text-xs sm:text-sm font-bold text-white font-mono truncate">{safeViewers.toLocaleString()}</p>
        </div>
      </div>

      {/* Voted */}
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-950/50 border border-slate-800/50">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-violet-500/15 text-violet-400 shrink-0">
          <CheckCircle2 size={14} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Voted</p>
          <p className="text-xs sm:text-sm font-bold text-violet-300 font-mono truncate">{safeVoted.toLocaleString()}</p>
        </div>
      </div>

      {/* Observing */}
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-950/50 border border-slate-800/50">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-800/50 text-slate-400 shrink-0">
          <Eye size={14} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Observing</p>
          <p className="text-xs sm:text-sm font-bold text-slate-300 font-mono truncate">{safeObserving.toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}
