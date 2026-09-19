import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, TrendingUp, Eye, CheckCircle2, ChevronRight } from 'lucide-react'
import { PollAnalyticsItem } from '../services/api'
import PollStatusBadge from './PollStatusBadges'

interface LeaderboardWidgetProps {
  polls: PollAnalyticsItem[]
}

type SortTab = 'votes' | 'engagement' | 'views'

export default function LeaderboardWidget({ polls }: LeaderboardWidgetProps) {
  const [tab, setTab] = useState<SortTab>('votes')

  const sorted = [...polls].sort((a, b) => {
    if (tab === 'votes') return b.votes - a.votes
    if (tab === 'engagement') return b.engagement_score - a.engagement_score
    return b.views - a.views
  }).slice(0, 5)

  const getRankBadge = (index: number) => {
    if (index === 0) return 'bg-amber-400/20 text-amber-300 border-amber-400/30'
    if (index === 1) return 'bg-slate-300/20 text-slate-200 border-slate-300/30'
    if (index === 2) return 'bg-amber-600/20 text-amber-500 border-amber-600/30'
    return 'bg-slate-800 text-slate-500 border-slate-700/50'
  }

  const maxVal = Math.max(
    ...sorted.map((p) => (tab === 'votes' ? p.votes : tab === 'engagement' ? p.engagement_score : p.views)),
    1
  )

  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400">
            <Trophy size={16} />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Most Popular Polls</h3>
            <p className="text-[11px] text-slate-500">Live performance leaderboard</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setTab('votes')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
              tab === 'votes'
                ? 'bg-violet-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Votes
          </button>
          <button
            onClick={() => setTab('engagement')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
              tab === 'engagement'
                ? 'bg-violet-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Engagement
          </button>
          <button
            onClick={() => setTab('views')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
              tab === 'views'
                ? 'bg-violet-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Views
          </button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-xs text-slate-500">No active polls to rank yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((poll, idx) => {
            const currentVal =
              tab === 'votes'
                ? poll.votes
                : tab === 'engagement'
                ? poll.engagement_score
                : poll.views
            const progressPct = Math.round((currentVal / maxVal) * 100)

            return (
              <Link
                key={poll.id}
                to={`/polls/${poll.id}/detail`}
                className="group block p-3 rounded-lg bg-slate-950/40 border border-slate-800/40 hover:border-slate-700/80 transition-all"
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-5 h-5 rounded-full text-[11px] font-bold border flex items-center justify-center shrink-0 ${getRankBadge(
                        idx
                      )}`}
                    >
                      {idx + 1}
                    </span>
                    <h4 className="text-xs font-medium text-white truncate group-hover:text-violet-300 transition-colors">
                      {poll.question}
                    </h4>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <PollStatusBadge status={poll.status} size="sm" />
                    <span className="text-xs font-semibold text-white font-mono">
                      {tab === 'engagement' ? `${poll.engagement_score}%` : currentVal.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-800/50 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5">
                  <span>{poll.votes} votes • {poll.views} views</span>
                  <span className="flex items-center gap-0.5 text-violet-400 group-hover:translate-x-0.5 transition-transform">
                    Details <ChevronRight size={12} />
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
