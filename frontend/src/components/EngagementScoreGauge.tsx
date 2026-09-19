import { Sparkles, ArrowUpRight } from 'lucide-react'

interface EngagementScoreGaugeProps {
  score: number
  totalVotes: number
  totalViews: number
}

export default function EngagementScoreGauge({
  score,
  totalVotes,
  totalViews,
}: EngagementScoreGaugeProps) {
  // Normalize score between 0 and 100
  const cleanScore = Math.min(100, Math.max(0, Math.round(score)))

  const getTier = (s: number) => {
    if (s >= 80) return { label: 'Exceptional', color: 'text-emerald-400', stroke: '#34d399', bg: 'bg-emerald-500/10' }
    if (s >= 60) return { label: 'High Engagement', color: 'text-violet-400', stroke: '#a78bfa', bg: 'bg-violet-500/10' }
    if (s >= 35) return { label: 'Moderate', color: 'text-amber-400', stroke: '#fbbf24', bg: 'bg-amber-500/10' }
    return { label: 'Building Momentum', color: 'text-slate-400', stroke: '#94a3b8', bg: 'bg-slate-500/10' }
  }

  const tier = getTier(cleanScore)
  const radius = 38
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (cleanScore / 100) * circumference

  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-sm flex flex-col justify-between h-full min-h-[380px]">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-violet-500/15 flex items-center justify-center text-violet-400 shrink-0">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm tracking-tight">Engagement Index</h3>
            <p className="text-xs text-slate-400">Audience interaction score</p>
          </div>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${tier.bg} ${tier.color} border border-current/20`}>
          {tier.label}
        </span>
      </div>

      <div className="flex items-center justify-around py-2">
        {/* Radial SVG gauge */}
        <div className="relative flex items-center justify-center">
          <svg className="w-24 h-24 transform -rotate-90">
            {/* Background track */}
            <circle
              cx="48"
              cy="48"
              r={radius}
              stroke="currentColor"
              strokeWidth="7"
              className="text-slate-800"
              fill="transparent"
            />
            {/* Value stroke */}
            <circle
              cx="48"
              cy="48"
              r={radius}
              stroke={tier.stroke}
              strokeWidth="7"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-2xl font-black text-white font-mono">{cleanScore}</span>
            <span className="text-[9px] text-slate-500 font-medium uppercase tracking-wider">/ 100</span>
          </div>
        </div>

        {/* Breakdown metrics */}
        <div className="space-y-2 text-xs">
          <div>
            <span className="text-slate-500 text-[11px] block">Conversion Rate</span>
            <span className="text-sm font-bold text-white font-mono">
              {totalViews > 0 ? Math.min(100, Math.round((totalVotes / totalViews) * 100)) : 0}%
            </span>
          </div>
          <div>
            <span className="text-slate-500 text-[11px] block">Total Impressions</span>
            <span className="text-sm font-bold text-slate-300 font-mono">{totalViews.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-slate-500 mt-2 border-t border-slate-800/60 pt-2 flex items-center justify-between">
        <span>Calculated via views, responses, and vote velocity</span>
        <ArrowUpRight size={12} className="text-slate-500" />
      </p>
    </div>
  )
}
