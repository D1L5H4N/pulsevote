import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Copy, QrCode, CheckCircle, Share2, ExternalLink, ArrowRight, AlertCircle, Download } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { pollApi, Poll } from '../services/api'

export default function PollSharePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [poll, setPoll] = useState<Poll | null>(null)
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)
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
    try {
      await navigator.clipboard.writeText(pollUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = pollUrl
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const downloadQR = () => {
    const canvas = document.getElementById('poll-qrcode-canvas') as HTMLCanvasElement
    if (!canvas) return

    const padding = 24
    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = canvas.width + padding * 2
    exportCanvas.height = canvas.height + padding * 2
    const ctx = exportCanvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height)
      ctx.drawImage(canvas, padding, padding)
    }

    exportCanvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `quorum-poll-${id?.slice(0, 8) || 'qr'}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 2000)
    }, 'image/png')
  }

  const sharePoll = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        const canvas = document.getElementById('poll-qrcode-canvas') as HTMLCanvasElement
        let filesToShare: File[] = []

        if (canvas && navigator.canShare) {
          try {
            const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
            if (blob) {
              const file = new File([blob], `quorum-poll-${id?.slice(0, 8) || 'qr'}.png`, { type: 'image/png' })
              if (navigator.canShare({ files: [file] })) {
                filesToShare = [file]
              }
            }
          } catch {
            // Ignore file conversion error and share link
          }
        }

        if (filesToShare.length > 0) {
          await navigator.share({
            title: `Quorum: ${poll?.question || 'Poll'}`,
            text: `Vote on this poll: "${poll?.question || 'Poll'}"\n${pollUrl}`,
            files: filesToShare,
          })
        } else {
          await navigator.share({
            title: `Quorum: ${poll?.question || 'Poll'}`,
            text: `Vote on this live poll: "${poll?.question || 'Poll'}"`,
            url: pollUrl,
          })
        }
        setShared(true)
        setTimeout(() => setShared(false), 2500)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          copyLink()
        }
      }
    } else {
      copyLink()
    }
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
        <p className="text-slate-400 text-sm mb-5">Scan to open the voting page. Perfect for screens, slides, and printed signs.</p>
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-white rounded-2xl shadow-xl flex items-center justify-center">
            <QRCodeCanvas
              id="poll-qrcode-canvas"
              value={pollUrl}
              size={220}
              bgColor="#ffffff"
              fgColor="#1e0a4b"
              level="H"
              includeMargin={false}
              className="rounded-lg w-44 h-44 sm:w-52 sm:h-52"
            />
          </div>
        </div>
        <p className="text-center text-xs text-slate-500 mt-2 mb-4 font-mono break-all">{pollUrl}</p>

        {/* QR Actions: Copy Link, Share, Download Image */}
        <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto">
          <button
            onClick={copyLink}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-semibold transition-all border ${
              copied
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400'
                : 'border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20'
            }`}
            title="Copy voting link"
          >
            {copied ? <><CheckCircle size={14} className="flex-shrink-0" /> Copied</> : <><Copy size={14} className="flex-shrink-0" /> Copy</>}
          </button>

          <button
            onClick={sharePoll}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-semibold transition-all border ${
              shared
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400'
                : 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20'
            }`}
            title="Share via WhatsApp, SMS, or other apps"
          >
            {shared ? <><CheckCircle size={14} className="flex-shrink-0" /> Shared</> : <><Share2 size={14} className="flex-shrink-0" /> Share</>}
          </button>

          <button
            onClick={downloadQR}
            className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-semibold border border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white transition-all shadow-sm"
            title="Download QR code as PNG image"
          >
            <Download size={14} className="flex-shrink-0" /> Download
          </button>
        </div>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm mb-8">
        <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
        <p>Anyone with this link can vote. The poll link is permanent: votes are counted until the poll is closed or expires.</p>
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
