import { CheckCircle2, PlusCircle, XCircle, Clock, Users, Flame, Sparkles, Activity } from 'lucide-react'
import { ActivityFeedItem } from '../services/api'

interface RecentActivityFeedProps {
  activities: ActivityFeedItem[]
}

function timeAgo(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffInSec = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSec < 5) return 'just now'
  if (diffInSec < 60) return `${diffInSec}s ago`
  const diffInMin = Math.floor(diffInSec / 60)
  if (diffInMin < 60) return `${diffInMin}m ago`
  const diffInHours = Math.floor(diffInMin / 60)
  if (diffInHours < 24) return `${diffInHours}h ago`
  const diffInDays = Math.floor(diffInHours / 24)
  return `${diffInDays}d ago`
}

export default function RecentActivityFeed({ activities }: RecentActivityFeedProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'vote':
        return <Flame size={14} className="text-amber-400" />
      case 'create':
        return <PlusCircle size={14} className="text-emerald-400" />
      case 'close':
        return <XCircle size={14} className="text-slate-400" />
      case 'expire':
        return <Clock size={14} className="text-rose-400" />
      case 'join':
        return <Users size={14} className="text-cyan-400" />
      default:
        return <Sparkles size={14} className="text-violet-400" />
    }
  }

  const getBg = (type: string) => {
    switch (type) {
      case 'vote':
        return 'bg-amber-500/10 border-amber-500/20'
      case 'create':
        return 'bg-emerald-500/10 border-emerald-500/20'
      case 'close':
        return 'bg-slate-800 border-slate-700/50'
      case 'expire':
        return 'bg-rose-500/10 border-rose-500/20'
      case 'join':
        return 'bg-cyan-500/10 border-cyan-500/20'
      default:
        return 'bg-violet-500/10 border-violet-500/20'
    }
  }

  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-sm h-full min-h-[380px] flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400 shrink-0">
              <Activity size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white text-sm tracking-tight">Live Activity Feed</h3>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-xs text-slate-400">Audience event stream</p>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono">Real-time sync</span>
        </div>

        {activities.length === 0 ? (
          <div className="flex flex-col justify-center items-center text-center py-12">
            <p className="text-xs text-slate-400 font-medium">No activity recorded yet.</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-[200px]">
              Votes, voter connects, and events will stream here live.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
            {activities.map((item, index) => (
              <div
                key={item.id || index}
                className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/40 border border-slate-800/40 transition-colors hover:border-slate-700/60"
              >
                <div
                  className={`w-7 h-7 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${getBg(
                    item.type
                  )}`}
                >
                  {getIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-200 leading-snug truncate">
                    {item.message || item.poll_title || 'New activity'}
                  </p>
                  {item.poll_title && item.message !== item.poll_title && (
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {item.poll_title}
                    </p>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 shrink-0 mt-0.5 font-mono">
                  {timeAgo(item.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 pt-3.5 border-t border-slate-800/50 flex items-center justify-between text-[11px] text-slate-500">
        <span>Redis event pipe</span>
        <span className="text-cyan-400 font-medium flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> Connected
        </span>
      </div>
    </div>
  )
}
