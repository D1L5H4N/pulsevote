import { PollStatus } from '../services/api'
import { Clock, Calendar, CheckCircle, XCircle } from 'lucide-react'

interface PollStatusBadgeProps {
  status: PollStatus
  size?: 'sm' | 'md'
}

export default function PollStatusBadge({ status, size = 'md' }: PollStatusBadgeProps) {
  const isSm = size === 'sm'

  switch (status) {
    case 'active':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ${
            isSm ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Active
        </span>
      )
    case 'scheduled':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 ${
            isSm ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
          }`}
        >
          <Calendar size={isSm ? 11 : 12} />
          Scheduled
        </span>
      )
    case 'closed':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-slate-800 text-slate-400 border border-slate-700/50 ${
            isSm ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
          }`}
        >
          <XCircle size={isSm ? 11 : 12} />
          Closed
        </span>
      )
    case 'expired':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 ${
            isSm ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
          }`}
        >
          <Clock size={isSm ? 11 : 12} />
          Expired
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400">
          <CheckCircle size={11} />
          {status}
        </span>
      )
  }
}
