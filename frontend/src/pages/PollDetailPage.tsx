import { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Share2, Trash2, QrCode, ExternalLink, Clock } from 'lucide-react'
import { pollApi, voteApi, Poll, ResultsResponse } from '../services/api'
import { useAuth } from '../context/AuthContext'
import ResultsChart from '../components/ResultsChart'
import QRCodeModal from '../components/QRCodeModal'
import { useWebSocket } from '../hooks/useWebSocket'
import ParticipantCounter from '../components/ParticipantCounter'
import LiveAnalyticsCards from '../components/LiveAnalyticsCards'
import PollStatusControl from '../components/PollStatusControl'
import VotingTimelineChart from '../components/VotingTimelineChart'

export default function PollDetailPage() {
  const { id }       = useParams<{ id: string }>()
  const { user }     = useAuth()
  const navigate     = useNavigate()

  const [poll, setPoll]                     = useState<Poll | null>(null)
  const [results, setResults]               = useState<ResultsResponse | null>(null)
  const [loading, setLoading]               = useState(true)
  const [showQR, setShowQR]                 = useState(false)
  const [copied, setCopied]                 = useState(false)
  const [error, setError]                   = useState('')
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const pollUrl = `${window.location.origin}/poll/${id}`

  useEffect(() => {
    if (!id) return
    Promise.all([pollApi.getById(id), voteApi.getResults(id)])
      .then(([pollRes, resultsRes]) => {
        setPoll(pollRes.data)
        setResults(resultsRes.data)
        // Redirect non-owners to the public results page
        if (user && pollRes.data.creator_id !== user.id) {
          navigate(`/results/${id}`, { replace: true })
        }
      })
      .catch(() => navigate('/dashboard'))
      .finally(() => setLoading(false))
  }, [id, user, navigate])

  // Live results via WebSocket
  const handleMessage = useCallback((data: ResultsResponse | Record<string, unknown>) => {
    // 1. Status changes
    if (data.type === 'status_change' && typeof data.status === 'string') {
      const newStatus = data.status as 'active' | 'closed' | 'expired'
      const newExpiry = data.expires_at !== undefined ? (data.expires_at as string) : undefined
      setPoll((p) => p ? { ...p, status: newStatus, expires_at: newExpiry ?? p.expires_at } : p)
      setResults((r) => r ? { ...r, status: newStatus, expires_at: newExpiry ?? r.expires_at } : r)
      return
    }

    // 2. Presence updates
    if (data.type === 'presence' && typeof data.total_viewers === 'number') {
      const v = data.total_viewers
      setResults((r) => r ? {
        ...r,
        total_viewers: v,
        observing: Math.max(0, v - r.total_votes),
      } : r)
      return
    }

    // 3. Full vote results payload
    if (data.results && Array.isArray(data.results)) {
      setResults(data as ResultsResponse)
      setRefreshTrigger((t) => t + 1)
    }
  }, [])

  useWebSocket({ pollId: id!, onMessage: handleMessage, enabled: !!id })

  const copyLink = async () => {
    await navigator.clipboard.writeText(pollUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleDelete = async () => {
    if (!id || !confirm('Permanently delete this poll and all its vote data? This action cannot be undone.')) return
    try {
      await pollApi.delete(id)
      navigate('/dashboard')
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to delete poll')
    }
  }

  const handleStatusChange = (newStatus: 'active' | 'closed' | 'expired', newExpiry?: string | null) => {
    setPoll((p) => p ? {
      ...p,
      status: newStatus,
      expires_at: newExpiry !== undefined ? (newExpiry || undefined) : p.expires_at,
    } : p)
    setResults((r) => r ? {
      ...r,
      status: newStatus,
      expires_at: newExpiry !== undefined ? (newExpiry || undefined) : r.expires_at,
    } : r)
  }

  if (loading) {
    return (
      <div className="page-container max-w-5xl mx-auto space-y-6">
        <div className="skeleton h-8 w-48 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
        </div>
        <div className="skeleton h-96 rounded-2xl" />
      </div>
    )
  }

  if (!poll || !results) return null

  return (
    <div className="page-container max-w-5xl mx-auto animate-fade-in space-y-6">
      {/* Back Button */}
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
        <ArrowLeft size={15} /> Back to Dashboard
      </Link>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
      )}

      {/* Poll Header Card */}
      <div className="glass-card p-6 border-slate-800/80 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <span className={poll.status === 'active' ? 'badge-active' : poll.status === 'closed' ? 'badge-closed' : 'badge-expired'}>
                {poll.status === 'active' && <span className="live-dot" />}
                {poll.status === 'active' ? 'Live' : poll.status}
              </span>

              <ParticipantCounter
                viewers={results.total_viewers || results.total_votes}
                voted={results.total_votes}
                observing={results.observing}
                compact
              />
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-white leading-snug tracking-tight">{poll.question}</h1>

            <div className="flex flex-wrap gap-4 mt-3 text-slate-400 text-xs">
              <span>{poll.options.length} options configured</span>
              {poll.expires_at && (
                <span className="flex items-center gap-1">
                  <Clock size={12} className="text-violet-400" />
                  {poll.status === 'expired' ? 'Expired' : 'Deadline:'} {new Date(poll.expires_at).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* FEATURE 2: Poll Owner Status Control */}
      <PollStatusControl
        pollId={poll.id}
        status={poll.status}
        expiresAt={poll.expires_at}
        onStatusChange={handleStatusChange}
      />

      {/* FEATURE 3: Live Analytics Dashboard Metrics */}
      <LiveAnalyticsCards
        results={results}
        onExpire={() => handleStatusChange('expired')}
      />

      {/* Layout Grid: Left (Charts) & Right (Actions) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Visual Analytics & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Graphic Distribution Chart */}
          <div className="glass-card p-5 sm:p-6 shadow-2xl border-slate-800/80">
            <ResultsChart
              results={results}
              showLeadBanner={false}
              showDetailedBreakdown={true}
            />
          </div>

          {/* FEATURE 4: Voting Timeline Activity Curve */}
          <VotingTimelineChart
            pollId={poll.id}
            refreshTrigger={refreshTrigger}
          />
        </div>

        {/* Right Column: Actions & Quick Sharing */}
        <div className="space-y-4">
          {/* Share Box */}
          <div className="glass-card p-5 border-slate-800/80 shadow-lg">
            <h3 className="font-semibold text-white mb-3.5 flex items-center gap-2 text-sm">
              <Share2 size={15} className="text-violet-400" /> Share with Audience
            </h3>
            <div className="space-y-2.5">
              <button
                onClick={copyLink}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                  copied
                    ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400'
                    : 'border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20'
                }`}
              >
                {copied ? '✓ Copied to Clipboard!' : <><Share2 size={14} /> Copy Voting Link</>}
              </button>

              <button
                onClick={() => setShowQR(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium border border-slate-700 text-slate-300 hover:bg-slate-800 transition-all"
              >
                <QrCode size={14} /> View / Download QR Code
              </button>

              <Link
                to={`/poll/${poll.id}`}
                target="_blank"
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium border border-slate-700 text-slate-300 hover:bg-slate-800 transition-all"
              >
                <ExternalLink size={14} /> Open Public Voting Page
              </Link>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="glass-card p-5 border-red-500/20 shadow-lg">
            <h3 className="font-semibold text-red-400 mb-2 text-xs uppercase tracking-wider">Danger Zone</h3>
            <p className="text-xs text-slate-400 mb-4">
              Permanently remove this poll and delete all cast votes from MongoDB and Redis.
            </p>
            <button
              onClick={handleDelete}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
            >
              <Trash2 size={14} /> Delete Poll
            </button>
          </div>
        </div>
      </div>

      {showQR && (
        <QRCodeModal
          pollId={poll.id}
          question={poll.question}
          onClose={() => setShowQR(false)}
        />
      )}
    </div>
  )
}
