import { useState } from 'react'
import { X, Copy, CheckCircle, Download, Share2 } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'

interface Props {
  pollId: string
  question: string
  onClose: () => void
}

/**
 * QRCodeModal renders a full-screen modal with the poll QR code.
 * The QR code is rendered via HTML5 Canvas (QRCodeCanvas) and exported
 * as a high-resolution PNG image file (avoiding raw XML/SVG downloads on mobile).
 * Includes Copy Link, Share (Web Share API), and Download Image options.
 */
export default function QRCodeModal({ pollId, question, onClose }: Props) {
  const pollUrl = `${window.location.origin}/poll/${pollId}`
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(pollUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback for older browsers
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

  // Download the QR code as a high-resolution PNG image file
  const downloadQR = () => {
    const canvas = document.getElementById('modal-qrcode-canvas') as HTMLCanvasElement
    if (!canvas) return

    // Create a high-res image with white padding for clean gallery display
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
      a.download = `quorum-poll-${pollId.slice(0, 8)}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 2000)
    }, 'image/png')
  }

  // Share poll link & QR code using native Web Share API
  const sharePoll = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        const canvas = document.getElementById('modal-qrcode-canvas') as HTMLCanvasElement
        let filesToShare: File[] = []

        if (canvas && navigator.canShare) {
          try {
            const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
            if (blob) {
              const file = new File([blob], `quorum-poll-${pollId.slice(0, 8)}.png`, { type: 'image/png' })
              if (navigator.canShare({ files: [file] })) {
                filesToShare = [file]
              }
            }
          } catch {
            // Ignore file conversion error and share text/link
          }
        }

        if (filesToShare.length > 0) {
          await navigator.share({
            title: `Quorum: ${question}`,
            text: `Vote on this poll: "${question}"\n${pollUrl}`,
            files: filesToShare,
          })
        } else {
          await navigator.share({
            title: `Quorum: ${question}`,
            text: `Vote on this live poll: "${question}"`,
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="glass-card w-full max-w-sm p-6 sm:p-8 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="pr-2">
            <h2 className="font-bold text-white text-lg">QR Code</h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 line-clamp-2">{question}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all flex-shrink-0"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* QR Code Canvas */}
        <div className="flex justify-center mb-5">
          <div className="p-4 bg-white rounded-2xl shadow-2xl flex items-center justify-center">
            <QRCodeCanvas
              id="modal-qrcode-canvas"
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

        {/* URL */}
        <p className="text-center text-xs text-slate-500 font-mono mb-5 break-all select-all px-2">
          {pollUrl}
        </p>

        {/* Actions: Copy Link, Share, Download Image */}
        <div className="grid grid-cols-3 gap-2">
          <button
            id="modal-copy-btn"
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
            id="modal-share-btn"
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
            id="modal-download-btn"
            onClick={downloadQR}
            className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-semibold border border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white transition-all shadow-sm"
            title="Download QR code as PNG image"
          >
            <Download size={14} className="flex-shrink-0" /> Download
          </button>
        </div>
      </div>
    </div>
  )
}
