import { useState } from 'react'
import { PlayCircle, StopCircle, RotateCcw, Clock, AlertCircle, X, Check } from 'lucide-react'
import { pollApi, PollStatus } from '../services/api'

interface Props {
  pollId: string
  status: PollStatus
  expiresAt?: string
  onStatusChange?: (newStatus: PollStatus, newExpiresAt?: string | null) => void
  className?: string
}

/**
 * PollStatusControl allows poll creators to manually Open, Close, or Reopen their polls.
 * Integrates with PATCH /api/polls/:id/open and PATCH /api/polls/:id/close.
 */
export default function PollStatusControl({
  pollId,
  status,
  expiresAt,
  onStatusChange,
  className = '',
}: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showReopenModal, setShowReopenModal] = useState(false)
  const [newExpiry, setNewExpiry] = useState('')

  const handleClose = async () => {
    if (!confirm('Are you sure you want to close this poll? Audience members will no longer be able to cast votes.')) {
      return
    }

    setLoading(true)
    setError('')
    try {
      await pollApi.close(pollId)
      onStatusChange?.('closed', expiresAt)
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to close poll')
    } finally {
      setLoading(false)
    }
  }

  const handleOpen = async (customExpiry?: string | null) => {
    setLoading(true)
    setError('')
    try {
      const expiryPayload = customExpiry ? new Date(customExpiry).toISOString() : null
      await pollApi.open(pollId, expiryPayload)
      onStatusChange?.('active', expiryPayload)
      setShowReopenModal(false)
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to open poll')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 shadow-md backdrop-blur-sm ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Poll Status</span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${
                status === 'active'
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : status === 'closed'
                  ? 'bg-slate-500/15 text-slate-300 border-slate-500/30'
                  : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              }`}
            >
              {status}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {status === 'active'
              ? 'Accepting real-time votes from audience'
              : status === 'closed'
              ? 'Voting paused by poll owner'
              : 'Poll deadline passed; voting locked'}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {status === 'active' ? (
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="btn-danger text-xs px-3.5 py-2 flex items-center gap-1.5 shadow-sm"
              title="Stop accepting votes"
            >
              <StopCircle size={14} />
              <span>{loading ? 'Closing...' : 'Close Poll'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (status === 'expired') {
                  setShowReopenModal(true)
                } else {
                  handleOpen(null)
                }
              }}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/30 transition-all active:scale-[0.98]"
              title="Resume accepting votes"
            >
              {status === 'expired' ? <RotateCcw size={14} /> : <PlayCircle size={14} />}
              <span>{loading ? 'Opening...' : status === 'expired' ? 'Reopen Poll' : 'Open Poll'}</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-400 mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertCircle size={13} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Reopen Modal for Expired Polls */}
      {showReopenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowReopenModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                <RotateCcw size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Reopen Expired Poll</h3>
                <p className="text-xs text-slate-400">Choose whether to set a new deadline or reopen indefinitely</p>
              </div>
            </div>

            <div className="space-y-4 my-5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Optional: New Expiration Deadline
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={newExpiry}
                    onChange={(e) => setNewExpiry(e.target.value)}
                    className="input text-xs py-2.5 pr-8"
                  />
                  <Clock size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Leave empty to reopen with no expiration deadline</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowReopenModal(false)}
                className="btn-secondary text-xs flex-1 py-2.5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleOpen(newExpiry || null)}
                disabled={loading}
                className="btn-primary text-xs flex-1 py-2.5 flex items-center justify-center gap-1.5"
              >
                <Check size={14} />
                <span>{loading ? 'Reopening...' : 'Confirm Reopen'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
