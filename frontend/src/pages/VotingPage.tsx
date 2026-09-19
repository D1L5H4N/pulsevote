import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { BarChart3, AlertCircle, Clock, Lock } from 'lucide-react'
import { pollApi, voteApi, Poll, ResultsResponse } from '../services/api'
import { useWebSocket } from '../hooks/useWebSocket'
import { useCountdown } from '../hooks/useCountdown'
import ParticipantCounter from '../components/ParticipantCounter'

export default function VotingPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [poll, setPoll]             = useState<Poll | null>(null)
  const [selected, setSelected]     = useState<number | null>(null)
  const [loading, setLoading]       = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')
  const [notFound, setNotFound]     = useState(false)
  const [presence, setPresence]     = useState({ viewers: 1, voted: 0, observing: 1 })

  useEffect(() => {
    if (!id) return
    pollApi.getById(id)
      .then((r) => setPoll(r.data))
      .catch((e) => {
        if (e?.response?.status === 404) setNotFound(true)
      })
      .finally(() => setLoading(false))
  }, [id])

  // Real-time status changes and participant counter updates via WebSocket
  const handleWsMessage = useCallback((data: ResultsResponse | Record<string, unknown>) => {
    // 1. Status changes (open/close/expired)
    if (data.status && typeof data.status === 'string') {
      setPoll((p) => p ? {
        ...p,
        status: data.status as 'active' | 'closed' | 'expired',
        expires_at: data.expires_at !== undefined ? (data.expires_at as string) : p.expires_at,
      } : p)
    }

    // 2. Presence updates
    const v = typeof data.total_viewers === 'number' ? data.total_viewers : undefined
    const totalVotes = typeof data.total_votes === 'number' ? data.total_votes : typeof data.active_participants === 'number' ? data.active_participants : undefined

    if (v !== undefined) {
      setPresence((prev) => {
        const newVoted = totalVotes !== undefined ? totalVotes : prev.voted
        return {
          viewers: v,
          voted: newVoted,
          observing: Math.max(0, v - newVoted),
        }
      })
    }
  }, [])

  useWebSocket({
    pollId: id!,
    enabled: !!id,
    onMessage: handleWsMessage,
  })

  // Real-time expiration countdown
  const countdown = useCountdown(poll?.expires_at, () => {
    setPoll((p) => p ? { ...p, status: 'expired' } : p)
  })

  const handleVote = async () => {
    if (selected === null || !id) return
    setSubmitting(true)
    setError('')
    try {
      await voteApi.vote(id, selected)
      // After a successful vote, redirect to the live results page
      navigate(`/results/${id}`)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string }; status?: number } }
      if (e?.response?.status === 409) {
        setError("You have already voted on this poll. Redirecting to live results...")
        setTimeout(() => navigate(`/results/${id}`), 1800)
      } else if (e?.response?.status === 403) {
        setError(e?.response?.data?.error || 'This poll is no longer accepting votes.')
        setPoll((p) => p ? { ...p, status: 'closed' } : p)
      } else {
        setError(e?.response?.data?.error || 'Failed to submit vote. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center">
          <BarChart3 size={48} className="text-slate-700 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Poll Not Found</h2>
          <p className="text-slate-400">This poll doesn't exist or has been removed.</p>
        </div>
      </div>
    )
  }

  if (!poll) return null

  const isClosed = poll.status === 'closed' || poll.status === 'expired' || (countdown ? countdown.isExpired : false)

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg animate-slide-up">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs font-medium shadow-sm">
              <span className={isClosed ? 'w-2 h-2 rounded-full bg-slate-500' : 'live-dot'} />
              <span className={isClosed ? 'text-slate-400 font-semibold uppercase' : 'text-emerald-400 font-semibold uppercase'}>
                {poll.status === 'expired' || (countdown && countdown.isExpired) ? 'Expired' : poll.status === 'closed' ? 'Closed' : 'Live Polling'}
              </span>
            </div>

            {/* Countdown Badge */}
            {countdown && !countdown.isExpired && !isClosed && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs font-mono font-bold animate-pulse">
                <Clock size={12} />
                <span>Ends in: {countdown.formatted}</span>
              </div>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white leading-snug tracking-tight">{poll.question}</h1>

          {/* Participant presence counter */}
          <div className="mt-4 flex justify-center">
            <ParticipantCounter
              viewers={presence.viewers}
              voted={presence.voted}
              observing={presence.observing}
              compact
            />
          </div>
        </div>

        {/* Options / Closed state */}
        {isClosed ? (
          <div className="glass-card p-8 text-center shadow-2xl border-slate-800/80">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Lock size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              {poll.status === 'expired' || (countdown && countdown.isExpired)
                ? 'Voting Has Concluded'
                : 'Poll Is Currently Paused'}
            </h3>
            <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
              {poll.status === 'expired' || (countdown && countdown.isExpired)
                ? 'The deadline for this poll has passed. You can view the final verified results.'
                : 'The creator has temporarily closed this poll to new responses. Check back shortly or view live results.'}
            </p>
            <button
              onClick={() => navigate(`/results/${id}`)}
              className="btn-primary w-full py-3"
            >
              <BarChart3 size={16} /> View Live Results
            </button>
          </div>
        ) : (
          <div className="glass-card p-6 shadow-2xl border-slate-800/80">
            {error && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-5">
                <AlertCircle size={16} className="flex-shrink-0" /> {error}
              </div>
            )}

            <div className="space-y-3 mb-6">
              {poll.options.map((option, i) => (
                <button
                  key={i}
                  id={`vote-option-${i}`}
                  onClick={() => setSelected(i)}
                  className={`vote-option w-full text-left ${selected === i ? 'selected' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-all ${
                      selected === i
                        ? 'border-violet-500 bg-violet-500 shadow-md shadow-violet-500/50'
                        : 'border-slate-600'
                    }`}>
                      {selected === i && (
                        <div className="w-full h-full rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-white" />
                        </div>
                      )}
                    </div>
                    <span className="text-slate-200 text-sm font-medium">{option}</span>
                  </div>
                </button>
              ))}
            </div>

            <button
              id="submit-vote-btn"
              onClick={handleVote}
              disabled={selected === null || submitting}
              className="btn-primary w-full py-3.5 shadow-lg shadow-violet-900/40 text-base"
            >
              {submitting ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting Vote...</>
              ) : selected === null ? (
                'Select an option to cast your vote'
              ) : (
                'Submit Vote →'
              )}
            </button>

            <div className="flex items-center justify-center gap-4 text-xs text-slate-500 mt-4">
              <span>Anonymous voting</span>
              <span>•</span>
              <span>Instant live verification</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
