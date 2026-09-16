import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'
import {
  BarChart3, Users, ExternalLink, Wifi, WifiOff,
  Share2, QrCode, CheckCircle
} from 'lucide-react'
import { voteApi, ResultsResponse } from '../services/api'
import { useWebSocket } from '../hooks/useWebSocket'
import QRCodeModal from '../components/QRCodeModal'

// Colour palette for chart bars — cycles through if > 6 options
const BAR_COLORS = ['#7c3aed', '#a855f7', '#8b5cf6', '#6d28d9', '#9333ea', '#c026d3']

function formatPct(n: number) {
  return n % 1 === 0 ? `${n}%` : `${n.toFixed(1)}%`
}

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

  // Real-time updates via WebSocket — no page refresh needed
  const handleMessage = useCallback((data: ResultsResponse) => {
    setResults(data)
    setLastUpdate(new Date())
  }, [])

  const { isConnected } = useWebSocket({
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
  const chartData = results.results.map((r) => ({
    name: r.option.length > 20 ? r.option.slice(0, 20) + '…' : r.option,
    fullName: r.option,
    votes: r.votes,
    percentage: r.percentage,
  }))

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
                <span className="live-dot" /> Live
              </span>
            )}

            {/* Real-time WebSocket connection indicator */}
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                isConnected
                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/25 text-amber-400'
              }`}
              title={isConnected ? 'Live real-time WebSocket connected' : 'Connecting to real-time updates...'}
            >
              {isConnected ? <Wifi size={12} className="animate-pulse" /> : <WifiOff size={12} />}
              {isConnected ? 'Real-time sync' : 'Connecting...'}
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-white leading-snug">{results.question}</h1>
          {lastUpdate && (
            <p className="text-xs text-slate-500 mt-1">
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

      {/* Total Votes */}
      <div className="glass-card p-5 mb-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
          <Users size={22} className="text-violet-400" />
        </div>
        <div>
          <p className="text-slate-400 text-sm">Total Votes</p>
          <p className="text-3xl font-bold text-white">{results.total_votes.toLocaleString()}</p>
        </div>
      </div>

      {/* Animated Bar Chart (Recharts) */}
      {results.total_votes > 0 && (
        <div className="glass-card p-6 mb-6">
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-5">Vote Distribution</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  color: '#f1f5f9',
                }}
                formatter={(value: number, _: string, entry) => [
                  `${value} votes (${formatPct(entry.payload.percentage)})`,
                  entry.payload.fullName,
                ]}
                labelFormatter={() => ''}
              />
              <Bar dataKey="votes" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={600}>
                {chartData.map((_, index) => (
                  <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Option-by-option breakdown */}
      <div className="glass-card p-6">
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-5">Breakdown</h2>
        <div className="space-y-5">
          {results.results.map((r, i) => {
            const isWinner = results.total_votes > 0 &&
              r.votes === Math.max(...results.results.map((x) => x.votes)) &&
              r.votes > 0

            return (
              <div key={i} id={`result-option-${i}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-200 text-sm font-medium">{r.option}</span>
                    {isWinner && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-medium">
                        Leading
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-sm">{r.votes.toLocaleString()} votes</span>
                    <span className="text-white font-semibold text-sm w-12 text-right">
                      {formatPct(r.percentage)}
                    </span>
                  </div>
                </div>

                {/* Animated progress bar */}
                <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="result-bar"
                    style={{
                      width: `${r.percentage}%`,
                      background: `linear-gradient(90deg, ${BAR_COLORS[i % BAR_COLORS.length]}cc, ${BAR_COLORS[i % BAR_COLORS.length]})`,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {results.total_votes === 0 && (
          <div className="text-center py-8">
            <p className="text-slate-500 text-sm">No votes yet. Share the poll link to start collecting responses.</p>
            <div className="flex justify-center gap-3 mt-4">
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
