import { Users, BarChart2, TrendingUp, Trophy, Activity, Clock } from 'lucide-react'
import { ResultsResponse } from '../services/api'
import { useCountdown } from '../hooks/useCountdown'

interface Props {
  results: ResultsResponse
  className?: string
  onExpire?: () => void
}

/**
 * LiveAnalyticsCards renders a professional SaaS metric dashboard grid.
 * Displays:
 *  - Total Votes
 *  - Total Viewers
 *  - Participation Rate
 *  - Leading Option
 *  - Poll Status & Expiration
 */
export default function LiveAnalyticsCards({ results, className = '', onExpire }: Props) {
  const countdown = useCountdown(results.expires_at, onExpire)

  // Calculations
  const totalVotes = results.total_votes || 0
  const totalViewers = Math.max(results.total_viewers || 0, totalVotes, 1)
  const participationRate = totalViewers > 0 ? Math.min(100, (totalVotes / totalViewers) * 100) : 0

  const sortedOptions = [...results.results].sort((a, b) => b.votes - a.votes)
  const leader = sortedOptions[0]
  const hasLeader = totalVotes > 0 && leader && leader.votes > 0

  return (
    <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 ${className}`}>
      {/* 1. Total Votes */}
      <div className="relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-b from-slate-900/90 to-slate-950/80 border border-slate-800/80 shadow-lg backdrop-blur-sm group hover:border-violet-500/40 transition-all duration-300">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Votes</span>
          <div className="w-8 h-8 rounded-xl bg-violet-500/15 text-violet-400 flex items-center justify-center">
            <BarChart2 size={16} />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {totalVotes.toLocaleString()}
          </p>
          <span className="text-xs text-slate-500 font-medium">cast</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-2 truncate">
          Recorded in MongoDB & Redis
        </p>
      </div>

      {/* 2. Total Viewers & Presence */}
      <div className="relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-b from-slate-900/90 to-slate-950/80 border border-slate-800/80 shadow-lg backdrop-blur-sm group hover:border-emerald-500/40 transition-all duration-300">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Live Viewers</span>
          <div className="relative w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
            <Users size={16} />
            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {totalViewers.toLocaleString()}
          </p>
          <span className="text-xs text-emerald-400 font-medium">active</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-2 truncate">
          {Math.max(0, totalViewers - totalVotes)} currently observing
        </p>
      </div>

      {/* 3. Participation Rate */}
      <div className="relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-b from-slate-900/90 to-slate-950/80 border border-slate-800/80 shadow-lg backdrop-blur-sm group hover:border-cyan-500/40 transition-all duration-300">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Turnout Rate</span>
          <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
            <TrendingUp size={16} />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {participationRate.toFixed(0)}%
          </p>
          <span className="text-xs text-cyan-400 font-medium">conversion</span>
        </div>
        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-3">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-all duration-500"
            style={{ width: `${participationRate}%` }}
          />
        </div>
      </div>

      {/* 4. Leading Option or Status */}
      <div className="relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-b from-slate-900/90 to-slate-950/80 border border-slate-800/80 shadow-lg backdrop-blur-sm group hover:border-amber-500/40 transition-all duration-300">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {hasLeader ? 'Leading Choice' : 'Poll Status'}
          </span>
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
            {hasLeader ? <Trophy size={16} /> : <Activity size={16} />}
          </div>
        </div>

        {hasLeader ? (
          <>
            <p className="text-lg sm:text-xl font-bold text-white tracking-tight truncate" title={leader.option}>
              {leader.option}
            </p>
            <p className="text-xs text-amber-400 font-medium mt-1">
              {leader.percentage.toFixed(1)}% ({leader.votes.toLocaleString()} votes)
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                results.status === 'active'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : results.status === 'closed'
                  ? 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                {results.status}
              </span>
            </div>
            {countdown && !countdown.isExpired ? (
              <p className="text-xs text-slate-400 mt-2 flex items-center gap-1 font-mono">
                <Clock size={12} className="text-violet-400" /> Ends in: {countdown.formatted}
              </p>
            ) : (
              <p className="text-[11px] text-slate-500 mt-2">Awaiting first responses</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
