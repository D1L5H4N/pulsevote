import { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Share2, StopCircle, Trash2, QrCode, ExternalLink, Users, Clock } from 'lucide-react'
import { pollApi, voteApi, Poll, ResultsResponse } from '../services/api'
import { useAuth } from '../context/AuthContext'
import ResultsChart from '../components/ResultsChart'
import QRCodeModal from '../components/QRCodeModal'
import { useWebSocket } from '../hooks/useWebSocket'

/**
 * PollDetailPage is the authenticated management view for a single poll.
 *
 * Only the poll creator can access this page (ownership enforced both
 * here in the UI and on the backend for close/delete operations).
 *
 * Features:
 *  - Live results chart updating via WebSocket
 *  - Close poll action (backend ownership check)
 *  - Delete poll action (backend ownership check)
 *  - QR code modal
 *  - Share link copy
 */
export default function PollDetailPage() {
  const { id }       = useParams<{ id: string }>()
  const { user }     = useAuth()
  const navigate     = useNavigate()

  const [poll, setPoll]         = useState<Poll | null>(null)
  const [results, setResults]   = useState<ResultsResponse | null>(null)
  const [loading, setLoading]   = useState(true)
  const [showQR, setShowQR]     = useState(false)
  const [copied, setCopied]     = useState(false)
  const [error, setError]       = useState('')

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

  // Live results via WebSocket — same as ResultsPage
  const handleMessage = useCallback((data: ResultsResponse) => {
    setResults(data)
  }, [])

  useWebSocket({ pollId: id!, onMessage: handleMessage, enabled: !!id })

  const copyLink = async () => {
    await navigator.clipboard.writeText(pollUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleClose = async () => {
    if (!id || !confirm('Close this poll? It will stop accepting new votes.')) return
    try {
      await pollApi.close(id)
      setPoll((p) => p ? { ...p, status: 'closed' } : p)
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to close poll')
    }
  }

  const handleDelete = async () => {
    if (!id || !confirm('Permanently delete this poll and all its vote data?')) return
    try {
      await pollApi.delete(id)
      navigate('/dashboard')
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to delete poll')
    }
  }

  if (loading) {
    return (
      <div className="page-container max-w-4xl mx-auto">
        <div className="skeleton h-8 w-48 mb-8 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 skeleton h-96 rounded-2xl" />
          <div className="skeleton h-96 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!poll || !results) return null

  return (
    <div className="page-container max-w-4xl mx-auto animate-fade-in">
      {/* Back */}
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm mb-6">
        <ArrowLeft size={15} /> Back to Dashboard
      </Link>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-6">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Poll Info */}
          <div className="glass-card p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  {poll.status === 'active' ? (
                    <span className="badge-active"><span className="live-dot" /> Live</span>
                  ) : poll.status === 'closed' ? (
                    <span className="badge-closed">Closed</span>
                  ) : (
                    <span className="badge-expired">Expired</span>
                  )}
                </div>
                <h1 className="text-xl font-bold text-white leading-snug">{poll.question}</h1>
                <div className="flex flex-wrap gap-4 mt-3 text-slate-500 text-xs">
                  <span className="flex items-center gap-1">
                    <Users size={12} /> {results.total_votes} votes
                  </span>
                  <span>{poll.options.length} options</span>
                  {poll.expires_at && (
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {poll.status === 'expired' ? 'Expired' : 'Expires'} {new Date(poll.expires_at).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="glass-card p-6">
            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-5">Vote Distribution</h2>
            <ResultsChart results={results} />
          </div>

          {/* Breakdown */}
          <div className="glass-card p-6">
            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-5">Option Breakdown</h2>
            <div className="space-y-4">
              {results.results.map((r, i) => {
                const isLeading = results.total_votes > 0 && r.votes === Math.max(...results.results.map((x) => x.votes)) && r.votes > 0
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-200 text-sm">{r.option}</span>
                        {isLeading && <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300">Leading</span>}
                      </div>
                      <span className="text-white font-semibold text-sm">{r.percentage.toFixed(1)}% · {r.votes}</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="result-bar" style={{ width: `${r.percentage}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="space-y-4">
          {/* Share */}
          <div className="glass-card p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Share2 size={15} className="text-violet-400" /> Share
            </h3>
            <div className="space-y-2">
              <button onClick={copyLink}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                  copied ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-violet-500/30 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20'
                }`}>
                {copied ? '✓ Copied!' : <><Share2 size={14} /> Copy Link</>}
              </button>
              <button onClick={() => setShowQR(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border border-slate-700 text-slate-300 hover:bg-slate-800 transition-all">
                <QrCode size={14} /> Show QR Code
              </button>
              <Link to={`/poll/${poll.id}`} target="_blank"
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border border-slate-700 text-slate-300 hover:bg-slate-800 transition-all">
                <ExternalLink size={14} /> Open Voting Page
              </Link>
            </div>
          </div>

          {/* Management */}
          <div className="glass-card p-5">
            <h3 className="font-semibold text-white mb-4">Management</h3>
            <div className="space-y-2">
              {poll.status === 'active' && (
                <button onClick={handleClose}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all">
                  <StopCircle size={14} /> Close Poll
                </button>
              )}
              <button onClick={handleDelete}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all">
                <Trash2 size={14} /> Delete Poll
              </button>
            </div>
          </div>
        </div>
      </div>

      {showQR && <QRCodeModal pollId={poll.id} question={poll.question} onClose={() => setShowQR(false)} />}
    </div>
  )
}
