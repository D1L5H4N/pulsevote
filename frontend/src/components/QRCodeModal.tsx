import { useState } from 'react'
import { X, Copy, CheckCircle, Download } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

interface Props {
  pollId: string
  question: string
  onClose: () => void
}

/**
 * QRCodeModal renders a full-screen modal with the poll QR code.
 * Extracted from PollSharePage so it can be triggered from any page
 * (e.g., dashboard action menu).
 *
 * The QR code is generated entirely client-side by qrcode.react —
 * no external API call is made.
 */
export default function QRCodeModal({ pollId, question, onClose }: Props) {
  const pollUrl = `${window.location.origin}/poll/${pollId}`
  const [copied, setCopied] = useState(false)

  const copyLink = async () => {
    await navigator.clipboard.writeText(pollUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  // Download the QR code as an SVG file
  const downloadQR = () => {
    const svg = document.getElementById('modal-qrcode')
    if (!svg) return
    const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `pulsevote-poll-${pollId}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="glass-card w-full max-w-sm p-8 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="font-bold text-white text-lg">QR Code</h2>
            <p className="text-slate-400 text-sm mt-1 line-clamp-2">{question}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all flex-shrink-0 ml-4"
          >
            <X size={18} />
          </button>
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-6">
          <div className="p-5 bg-white rounded-2xl shadow-xl">
            <QRCodeSVG
              id="modal-qrcode"
              value={pollUrl}
              size={200}
              bgColor="#ffffff"
              fgColor="#1e0a4b"
              level="H"
            />
          </div>
        </div>

        {/* URL */}
        <p className="text-center text-xs text-slate-500 font-mono mb-5 break-all">{pollUrl}</p>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={copyLink}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all border ${
              copied
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-violet-500/30 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20'
            }`}>
            {copied ? <><CheckCircle size={14} /> Copied!</> : <><Copy size={14} /> Copy Link</>}
          </button>
          <button onClick={downloadQR}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border border-slate-700 text-slate-300 hover:bg-slate-800 transition-all">
            <Download size={14} /> Download
          </button>
        </div>
      </div>
    </div>
  )
}
