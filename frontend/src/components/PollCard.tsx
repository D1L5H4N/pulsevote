import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, Trash2, StopCircle, QrCode, BarChart3, Clock, Copy, CheckCircle } from 'lucide-react'
import { Poll, pollApi } from '../services/api'
import QRCodeModal from './QRCodeModal'

interface Props {
  poll: Poll
  onRefresh: () => void
}

/**
 * PollCard is a card-style representation of a single poll.
 * Used on the MyPollsPage for a visual grid layout (vs the dashboard table).
 *
 * Responsibilities:
 *  - Display poll metadata (question, status, expiry, option count)
 *  - Provide quick actions: copy link, show QR code, view results, close, delete
 */
export default function PollCard({ poll, onRefresh }: Props) {
  const [showQR, setShowQR]   = useState(false)
  const [copied, setCopied]   = useState(false)

  const pollUrl = `${window.location.origin}/poll/${poll.id}`

  const copyLink = async (e: React.MouseEvent) => {
    e.preventDefault()
    await navigator.clipboard.writeText(pollUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClose = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!confirm('Close this poll? It will stop accepting votes.')) return
    try { await pollApi.close(poll.id); onRefresh() } catch { /* ignore */ }
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!confirm('Permanently delete this poll?')) return
    try { await pollApi.delete(poll.id); onRefresh() } catch { /* ignore */ }
  }

  const statusConfig = {
    active:  { dot: 'bg-emerald-400', label: 'Active',  cls: 'badge-active'  },
    closed:  { dot: 'bg-slate-500',   label: 'Closed',  cls: 'badge-closed'  },
    expired: { dot: 'bg-amber-400',   label: 'Expired', cls: 'badge-expired' },
  }[poll.status]

  return (
    <>
      <div className="glass-card p-6 flex flex-col gap-4 hover:border-violet-500/20 transition-all duration-300 group hover:-translate-y-0.5">
        {/* Status + Date */}
        <div className="flex items-center justify-between">
          <span className={statusConfig.cls}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot} ${poll.status === 'active' ? 'animate-pulse' : ''}`} />
            {statusConfig.label}
          </span>
          <span className="text-slate-500 text-xs">{new Date(poll.created_at).toLocaleDateString()}</span>
        </div>

        {/* Question */}
        <h3 className="text-white font-semibold text-sm leading-snug line-clamp-3 flex-1">
          {poll.question}
        </h3>

        {/* Meta */}
        <div className="flex items-center gap-3 text-slate-500 text-xs">
          <span>{poll.options.length} options</span>
          {poll.expires_at && (
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {new Date(poll.expires_at).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800">
          <Link to={`/results/${poll.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 transition-all font-medium">
            <BarChart3 size={13} /> Results
          </Link>

          <button onClick={copyLink}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
              copied ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}>
            {copied ? <><CheckCircle size={13} /> Copied</> : <><Copy size={13} /> Link</>}
          </button>

          <button onClick={(e) => { e.preventDefault(); setShowQR(true) }}
            className="p-2 rounded-lg text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 transition-all"
            title="Show QR code">
            <QrCode size={13} />
          </button>

          {poll.status === 'active' && (
            <button onClick={handleClose}
              className="p-2 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-all"
              title="Close poll">
              <StopCircle size={13} />
            </button>
          )}

          <button onClick={handleDelete}
            className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
            title="Delete poll">
            <Trash2 size={13} />
          </button>

          <Link to={`/poll/${poll.id}`} target="_blank"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
            title="Open voting page">
            <ExternalLink size={13} />
          </Link>
        </div>
      </div>

      {showQR && (
        <QRCodeModal pollId={poll.id} question={poll.question} onClose={() => setShowQR(false)} />
      )}
    </>
  )
}
