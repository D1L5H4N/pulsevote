import { useEffect, useState, useCallback } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { Activity, TrendingUp, Clock } from 'lucide-react'
import { voteApi, TimelinePoint } from '../services/api'

interface Props {
  pollId: string
  refreshTrigger?: number // increments whenever a new vote WebSocket message arrives
  className?: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: { payload: TimelinePoint }[]
}

function CustomTimelineTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload

  return (
    <div className="rounded-xl bg-slate-900/95 border border-slate-700/80 p-3 shadow-2xl backdrop-blur-md">
      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5 font-medium">
        <Clock size={12} className="text-violet-400" />
        <span>Time: {d.timestamp}</span>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4 text-xs">
          <span className="text-slate-400">Votes in interval:</span>
          <span className="font-bold text-violet-300">+{d.votes}</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-xs">
          <span className="text-slate-400">Cumulative total:</span>
          <span className="font-bold text-white">{d.cumulative} votes</span>
        </div>
      </div>
    </div>
  )
}

/**
 * VotingTimelineChart displays real-time vote activity aggregated over time.
 * Supports toggling between Interval Velocity (votes/min) and Cumulative growth.
 */
export default function VotingTimelineChart({ pollId, refreshTrigger = 0, className = '' }: Props) {
  const [timeline, setTimeline] = useState<TimelinePoint[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'cumulative' | 'interval'>('cumulative')

  const fetchTimeline = useCallback(async () => {
    if (!pollId) return
    try {
      const res = await voteApi.getTimeline(pollId)
      setTimeline(res.data || [])
    } catch {
      // Handled gracefully by empty state
    } finally {
      setLoading(false)
    }
  }, [pollId])

  useEffect(() => {
    fetchTimeline()
  }, [fetchTimeline, refreshTrigger])

  if (loading && timeline.length === 0) {
    return (
      <div className={`p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 ${className}`}>
        <div className="skeleton h-6 w-40 mb-4 rounded-lg" />
        <div className="skeleton h-48 w-full rounded-xl" />
      </div>
    )
  }

  if (timeline.length === 0) {
    return (
      <div className={`p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-center py-10 ${className}`}>
        <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center mx-auto mb-3">
          <Activity size={20} />
        </div>
        <h4 className="text-sm font-semibold text-white mb-1">Voting Timeline</h4>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Vote velocity and activity curves over time will appear here automatically as votes are recorded.
        </p>
      </div>
    )
  }

  return (
    <div className={`rounded-xl p-6 bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm h-full min-h-[380px] flex flex-col justify-between ${className}`}>
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-violet-500/15 flex items-center justify-center text-violet-400 shrink-0">
            <TrendingUp size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white text-sm whitespace-nowrap tracking-tight">Activity Timeline</h3>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate mt-0.5">Minute-by-minute vote stream</p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="h-8 inline-flex items-center gap-0.5 rounded-lg bg-slate-950/80 p-0.5 border border-slate-800 text-[11px] shrink-0 ml-auto">
          <button
            type="button"
            onClick={() => setViewMode('cumulative')}
            className={`h-7 px-2.5 rounded-md font-medium transition-all ${
              viewMode === 'cumulative'
                ? 'bg-violet-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Cumulative
          </button>
          <button
            type="button"
            onClick={() => setViewMode('interval')}
            className={`h-7 px-2.5 rounded-md font-medium transition-all ${
              viewMode === 'interval'
                ? 'bg-violet-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Velocity
          </button>
        </div>
      </div>

      {/* Recharts Area Curve */}
      <div className="w-full flex-1 min-h-[220px] mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={timeline} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="timelineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="timestamp"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={{ stroke: '#334155' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTimelineTooltip />} />
            <Area
              type="monotone"
              dataKey={viewMode === 'cumulative' ? 'cumulative' : 'votes'}
              stroke="#8b5cf6"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#timelineGrad)"
              isAnimationActive
              animationDuration={600}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
