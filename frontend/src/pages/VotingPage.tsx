import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { BarChart3, AlertCircle, Clock } from 'lucide-react'
import { pollApi, voteApi, Poll } from '../services/api'

export default function VotingPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [poll, setPoll]             = useState<Poll | null>(null)
  const [selected, setSelected]     = useState<number | null>(null)
  const [loading, setLoading]       = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')
  const [notFound, setNotFound]     = useState(false)

  useEffect(() => {
    if (!id) return
    pollApi.getById(id)
      .then((r) => setPoll(r.data))
      .catch((e) => {
        if (e?.response?.status === 404) setNotFound(true)
      })
      .finally(() => setLoading(false))
  }, [id])

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
        setError("You've already voted on this poll. Redirecting to results...")
        setTimeout(() => navigate(`/results/${id}`), 2000)
      } else if (e?.response?.status === 403) {
        setError(e?.response?.data?.error || 'This poll is no longer accepting votes.')
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

  const isClosed = poll.status === 'closed' || poll.status === 'expired'

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg animate-slide-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs font-medium mb-5">
            <span className={isClosed ? 'w-2 h-2 rounded-full bg-slate-500' : 'live-dot'} />
            {isClosed ? `Poll ${poll.status}` : 'Poll is live'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white leading-snug">{poll.question}</h1>
          {poll.expires_at && !isClosed && (
            <p className="text-slate-500 text-sm mt-3 flex items-center justify-center gap-1.5">
              <Clock size={13} />
              Closes {new Date(poll.expires_at).toLocaleString()}
            </p>
          )}
        </div>

        {/* Options */}
        {isClosed ? (
          <div className="glass-card p-8 text-center">
            <p className="text-slate-400 mb-4">This poll is no longer accepting votes.</p>
            <button
              onClick={() => navigate(`/results/${id}`)}
              className="btn-primary"
            >
              <BarChart3 size={16} /> View Results
            </button>
          </div>
        ) : (
          <div className="glass-card p-6">
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
                        ? 'border-violet-500 bg-violet-500'
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
              className="btn-primary w-full py-3.5"
            >
              {submitting ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</>
              ) : selected === null ? (
                'Select an option to vote'
              ) : (
                'Submit Vote →'
              )}
            </button>

            <p className="text-center text-xs text-slate-600 mt-4">Your vote is anonymous and cannot be changed.</p>
          </div>
        )}
      </div>
    </div>
  )
}
