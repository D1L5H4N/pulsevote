import { PlusCircle, Sparkles, Copy, Share2, StopCircle, BarChart2 } from 'lucide-react'
import { Link } from 'react-router-dom'

interface QuickActionsPanelProps {
  onOpenTemplates: () => void
  onQuickDuplicate?: () => void
  onQuickShare?: () => void
  onQuickClose?: () => void
  hasActivePolls?: boolean
}

export default function QuickActionsPanel({
  onOpenTemplates,
  onQuickDuplicate,
  onQuickShare,
  onQuickClose,
  hasActivePolls = false,
}: QuickActionsPanelProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        to="/polls/create"
        id="create-poll-btn"
        className="btn-primary flex items-center gap-1.5 text-xs py-2 px-3.5 shadow-lg shadow-violet-600/20"
      >
        <PlusCircle size={14} />
        <span>Create Poll</span>
      </Link>

      <button
        onClick={onOpenTemplates}
        id="templates-btn"
        className="flex items-center gap-1.5 text-xs font-medium text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 rounded-lg py-2 px-3 transition-colors"
      >
        <Sparkles size={14} className="text-violet-400" />
        <span>Use Template</span>
      </button>

      {onQuickShare && (
        <button
          onClick={onQuickShare}
          className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg py-2 px-3 transition-colors"
          title="Share latest active poll"
        >
          <Share2 size={14} className="text-slate-400" />
          <span>Quick Share</span>
        </button>
      )}

      {onQuickDuplicate && (
        <button
          onClick={onQuickDuplicate}
          className="hidden md:flex items-center gap-1.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg py-2 px-3 transition-colors"
          title="Duplicate most recent poll"
        >
          <Copy size={14} className="text-slate-400" />
          <span>Clone Recent</span>
        </button>
      )}

      {onQuickClose && hasActivePolls && (
        <button
          onClick={onQuickClose}
          className="hidden lg:flex items-center gap-1.5 text-xs font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg py-2 px-3 transition-colors"
          title="Quickly close active poll"
        >
          <StopCircle size={14} />
          <span>End Session</span>
        </button>
      )}

      <Link
        to="/my-polls"
        className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-900/50 hover:bg-slate-800 border border-slate-800/80 rounded-lg py-2 px-3 transition-colors"
      >
        <BarChart2 size={14} />
        <span>Manage All</span>
      </Link>
    </div>
  )
}
