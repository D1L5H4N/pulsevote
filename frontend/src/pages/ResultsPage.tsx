import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  BarChart3, ExternalLink,
  Share2, QrCode, CheckCircle, Clock
} from 'lucide-react'
import { voteApi, ResultsResponse } from '../services/api'
import { useWebSocket } from '../hooks/useWebSocket'
import QRCodeModal from '../components/QRCodeModal'
import ResultsChart from '../components/ResultsChart'

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>()
  const [results, setResults]       = useState<ResultsResponse | null>(null)
  const [loading, setLoading]       = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [showQR, setShowQR]         = useState(false)
  const [copied, setCopied]         = useState(false)

  const pollUrl = `${window.location.origin}/poll/${id}`

  // Load initial results from REST API on mount
  useEffect(() => {
    if (!id) return
    voteApi.getResults(id)
      .then((r) => setResults(r.data))
      .catch(() => {/* handled by empty state */})
      .finally(() => setLoading(false))
  }, [id])

  // Real-time updates via WebSocket (no page refresh needed)
  const handleMessage = useCallback((data: ResultsResponse) => {
    setResults(data)
    setLastUpdate(new Date())
  }, [])

  useWebSocket({
    pollId: id!,
    onMessage: handleMessage,
    enabled: !!id,
  })

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(pollUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback if clipboard API is restricted
      prompt('Copy this voting link:', pollUrl)
    }
  }

  if (loading) {
    return (
      <div className="page-container max-w-3xl mx-auto">
        <div className="skeleton h-10 w-2/3 mb-6 rounded-xl" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (!results) {
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

  const isClosed = results.status !== 'active'

  return (
    <div className="page-container max-w-3xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            {isClosed ? (
              <span className={results.status === 'expired' ? 'badge-expired' : 'badge-closed'}>
                {results.status}
              </span>
            ) : (
              <span className="badge-active">
                <span className="live-dot" /> Live Polling
              </span>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-white leading-snug">{results.question}</h1>
          {lastUpdate && (
            <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
              <Clock size={12} className="text-slate-600" />
              Last live update: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Action Buttons: Share, QR Code, Vote */}
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          <button
            id="share-link-btn"
            onClick={copyLink}
            className={`btn-secondary text-sm flex items-center gap-1.5 transition-all ${
              copied ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' : ''
            }`}
            title="Copy voting link to clipboard"
          >
            {copied ? <CheckCircle size={14} /> : <Share2 size={14} />}
            {copied ? 'Copied Link!' : 'Share Link'}
          </button>

          <button
            id="show-qr-btn"
            onClick={() => setShowQR(true)}
            className="btn-secondary text-sm flex items-center gap-1.5"
            title="Display QR code for audience scanning"
          >
            <QrCode size={14} /> QR Code
          </button>

          <Link
            to={`/poll/${id}`}
            target="_blank"
            className="btn-primary text-sm flex items-center gap-1.5"
            title="Open voting page in a new tab"
          >
            <ExternalLink size={14} /> Vote
          </Link>
        </div>
      </div>

      {/* Main Graphic Distribution Card */}
      <div className="glass-card p-5 sm:p-6 mb-6 shadow-2xl border-slate-800/80">
        <ResultsChart
          results={results}
          showLeadBanner={true}
          showDetailedBreakdown={true}
        />

        {results.total_votes === 0 && (
          <div className="text-center py-6 border-t border-slate-800/60 mt-4">
            <div className="flex justify-center gap-3">
              <button onClick={copyLink} className="btn-secondary text-sm">
                <Share2 size={14} /> Copy Voting Link
              </button>
              <button onClick={() => setShowQR(true)} className="btn-secondary text-sm">
                <QrCode size={14} /> Show QR Code
              </button>
            </div>
          </div>
        )}
      </div>

      {/* QR Code Modal popup */}
      {showQR && (
        <QRCodeModal
          pollId={id!}
          question={results.question}
          onClose={() => setShowQR(false)}
        />
      )}
    </div>
  )
}
