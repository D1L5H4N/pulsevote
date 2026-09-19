import { BarChart3, CheckCircle2, XCircle, Users, Activity } from 'lucide-react'
import { DashboardStats } from '../services/api'

interface DashboardStatsCardsProps {
  stats: DashboardStats
  liveViewers?: number
}

export default function DashboardStatsCards({ stats, liveViewers = 0 }: DashboardStatsCardsProps) {
  const cards = [
    {
      label: 'Total Polls',
      value: stats.total_polls ?? stats.total,
      subtext: `${stats.active_polls ?? stats.active} currently live`,
      icon: <BarChart3 size={18} className="text-violet-400" />,
      bgIcon: 'bg-violet-500/15',
      accentColor: 'from-violet-500/20 to-transparent',
    },
    {
      label: 'Active Polls',
      value: stats.active_polls ?? stats.active,
      subtext: liveViewers > 0 ? `${liveViewers} active viewers` : 'Accepting responses',
      icon: <CheckCircle2 size={18} className="text-emerald-400" />,
      bgIcon: 'bg-emerald-500/15',
      accentColor: 'from-emerald-500/20 to-transparent',
      isLive: (stats.active_polls ?? stats.active) > 0,
    },
    {
      label: 'Closed / Expired',
      value: (stats.closed_polls ?? stats.closed) + (stats.expired ?? 0),
      subtext: `${stats.expired ?? 0} auto-expired`,
      icon: <XCircle size={18} className="text-slate-400" />,
      bgIcon: 'bg-slate-500/15',
      accentColor: 'from-slate-500/20 to-transparent',
    },
    {
      label: 'Total Votes Cast',
      value: (stats.total_votes ?? 0).toLocaleString(),
      subtext: `${stats.total_views ?? 0} total impressions`,
      icon: <Activity size={18} className="text-indigo-400" />,
      bgIcon: 'bg-indigo-500/15',
      accentColor: 'from-indigo-500/20 to-transparent',
    },
    {
      label: 'Total Participants',
      value: (stats.total_participants ?? 0).toLocaleString(),
      subtext: `${stats.avg_engagement ?? 0}% engagement avg`,
      icon: <Users size={18} className="text-cyan-400" />,
      bgIcon: 'bg-cyan-500/15',
      accentColor: 'from-cyan-500/20 to-transparent',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
      {cards.map((card, idx) => (
        <div
          key={card.label}
          className={`relative overflow-hidden rounded-xl border border-slate-800/80 bg-slate-900/60 p-4.5 backdrop-blur-sm transition-all duration-200 hover:border-slate-700/80 ${
            idx === 4 ? 'col-span-2 lg:col-span-1' : ''
          }`}
        >
          {/* Subtle top gradient accent */}
          <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${card.accentColor}`} />

          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">{card.label}</span>
            <div className={`w-8 h-8 rounded-lg ${card.bgIcon} flex items-center justify-center`}>
              {card.icon}
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <p className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {card.value}
            </p>
            {card.isLive && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500 mt-1.5 truncate">{card.subtext}</p>
        </div>
      ))}
    </div>
  )
}
