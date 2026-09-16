import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Copy, QrCode, CheckCircle, Share2, ExternalLink, ArrowRight, AlertCircle } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { pollApi, Poll } from '../services/api'

export default function PollSharePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [poll, setPoll] = useState<Poll | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  const pollUrl = `${window.location.origin}/poll/${id}`

  useEffect(() => {
    if (!id) return
    pollApi.getById(id)
      .then((r) => setPoll(r.data))
      .catch(() => navigate('/dashboard'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  const copyLink = async () => {
    await navigator.clipboard.writeText(pollUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  if (loading) {
    return (
      <div className="page-container max-w-2xl mx-auto">
        <div className="skeleton h-96 rounded-2xl" />
      </div>
    )
  }

  if (!poll) return null

  return (
    <div className="page-container max-w-2xl mx-auto animate-slide-up">
      {/* Success Banner */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-8">
        <CheckCircle size={20} className="flex-shrink-0" />
        <div>
          <p className="font-semibold">Poll created successfully!</p>
          <p className="text-sm text-emerald-500/80">Share the link below with your audience.</p>
        </div>
      </div>

      {/* Poll Question Preview */}
      <div className="glass-card p-6 mb-6">
        <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-2">Your Poll</p>
        <h2 className="text-white font-semibold text-lg">{poll.question}</h2>
        <p className="text-slate-400 text-sm mt-1">{poll.options.length} options • Status: <span className="text-emerald-400">{poll.status}</span></p>
      </div>

      {/* Share Link */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Share2 size={16} className="text-violet-400" />
          <h3 className="font-semibold text-white">Share Link</h3>
        </div>

        <div className="flex gap-3">
          <div className="flex-1 px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-300 truncate font-mono">
            {pollUrl}
          </div>
          <button
            id="copy-link-btn"
            onClick={copyLink}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              copied
                ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                : 'bg-violet-500/20 border border-violet-500/30 text-violet-400 hover:bg-violet-500/30'
            }`}
          >
            {copied ? <><CheckCircle size={15} /> Copied!</> : <><Copy size={15} /> Copy</>}
          </button>
        </div>

        <div className="flex gap-3 mt-4">
          <a
            href={pollUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary flex-1 text-sm"
          >
            <ExternalLink size={15} /> Open Voting Page
          </a>
          <a
            href={`/results/${id}`}
            className="btn-secondary flex-1 text-sm"
          >
            <ExternalLink size={15} /> View Results
          </a>
        </div>
      </div>

      {/* QR Code */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <QrCode size={16} className="text-violet-400" />
          <h3 className="font-semibold text-white">QR Code</h3>
        </div>
        <p className="text-slate-400 text-sm mb-5">Scan to open the voting page. Perfect for screens and presentations.</p>
        <div className="flex justify-center">
          <div className="p-5 bg-white rounded-2xl shadow-xl">
            <QRCodeSVG
              id="poll-qrcode"
              value={pollUrl}
              size={200}
              bgColor="#ffffff"
              fgColor="#1e0a4b"
              level="H"
            />
          </div>
        </div>
        <p className="text-center text-xs text-slate-600 mt-3 font-mono">{pollUrl}</p>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm mb-8">
        <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
        <p>Anyone with this link can vote. The poll link is permanent — votes are counted until the poll is closed or expires.</p>
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <button onClick={() => navigate('/dashboard')} className="btn-secondary flex-1">
          Back to Dashboard
        </button>
        <button onClick={() => navigate(`/results/${id}`)} className="btn-primary flex-1">
          Watch Live Results <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}
