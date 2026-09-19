import { useState } from 'react'
import { X, FileSpreadsheet, FileText, Download, Printer, Loader2 } from 'lucide-react'
import { PollAnalyticsItem, pollApi } from '../services/api'

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  poll: PollAnalyticsItem | null
}

export default function ExportModal({ isOpen, onClose, poll }: ExportModalProps) {
  const [downloading, setDownloading] = useState(false)

  if (!isOpen || !poll) return null

  const handleDownloadCSV = async (format: 'csv' | 'excel') => {
    setDownloading(true)
    try {
      const response = await pollApi.export(poll.id, format)
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${poll.question.slice(0, 20).replace(/\s+/g, '_')}_${format}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch {
      alert('Failed to download export file. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  const handlePrintPDF = () => {
    // Open a print-ready window styled for browser PDF export
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Quorum Poll Report - ${poll.question}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1e293b; }
            h1 { font-size: 22px; color: #0f172a; margin-bottom: 8px; }
            .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; background: #e2e8f0; font-size: 11px; font-weight: 600; text-transform: uppercase; }
            .stats { display: flex; gap: 20px; margin: 24px 0; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 16px 0; }
            .stat-box { flex: 1; }
            .stat-label { font-size: 11px; color: #64748b; font-weight: 500; }
            .stat-val { font-size: 20px; font-weight: bold; color: #0f172a; margin-top: 2px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { text-align: left; padding: 10px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; font-size: 12px; color: #475569; }
            td { padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
            .footer { margin-top: 40px; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 12px; }
          </style>
        </head>
        <body>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h2>Quorum SaaS Poll Report</h2>
            <span class="badge">${poll.status}</span>
          </div>
          <h1>${poll.question}</h1>
          <p style="color:#64748b; font-size:12px;">Generated on: ${new Date().toLocaleString()} • Created: ${new Date(poll.created_at).toLocaleDateString()}</p>

          <div class="stats">
            <div class="stat-box"><div class="stat-label">TOTAL VOTES</div><div class="stat-val">${poll.votes}</div></div>
            <div class="stat-box"><div class="stat-label">TOTAL IMPRESSIONS</div><div class="stat-val">${poll.views}</div></div>
            <div class="stat-box"><div class="stat-label">PARTICIPATION RATE</div><div class="stat-val">${poll.participation_rate}%</div></div>
            <div class="stat-box"><div class="stat-label">ENGAGEMENT SCORE</div><div class="stat-val">${poll.engagement_score} / 100</div></div>
          </div>

          <h3>Configured Options</h3>
          <table>
            <thead>
              <tr>
                <th style="width: 40px;">#</th>
                <th>Option Title</th>
              </tr>
            </thead>
            <tbody>
              ${poll.options.map((opt, i) => `<tr><td>${i + 1}</td><td>${opt}</td></tr>`).join('')}
            </tbody>
          </table>

          <div class="footer">
            Report generated via Quorum Real-Time Polling Platform.
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `

    printWindow.document.open()
    printWindow.document.write(htmlContent)
    printWindow.document.close()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center text-indigo-400">
              <Download size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Export Poll Dataset</h2>
              <p className="text-xs text-slate-400">Download formatted telemetry</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="my-4 p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <p className="text-xs font-medium text-white truncate">{poll.question}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {poll.votes} votes • {poll.views} views • {poll.options.length} options
          </p>
        </div>

        {/* Options */}
        <div className="space-y-2.5">
          <button
            onClick={() => handleDownloadCSV('csv')}
            disabled={downloading}
            className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-850 transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                <FileSpreadsheet size={18} />
              </div>
              <div>
                <span className="text-xs font-semibold text-white block">Comma Separated (.CSV)</span>
                <span className="text-[11px] text-slate-500">Universal data table format</span>
              </div>
            </div>
            <Download size={15} className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
          </button>

          <button
            onClick={() => handleDownloadCSV('excel')}
            disabled={downloading}
            className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-850 transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-teal-500/15 text-teal-400 flex items-center justify-center">
                <FileSpreadsheet size={18} />
              </div>
              <div>
                <span className="text-xs font-semibold text-white block">Microsoft Excel (.CSV / XLSX)</span>
                <span className="text-[11px] text-slate-500">Spreadsheet ready formatting</span>
              </div>
            </div>
            <Download size={15} className="text-slate-500 group-hover:text-teal-400 transition-colors" />
          </button>

          <button
            onClick={handlePrintPDF}
            className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-850 transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-violet-500/15 text-violet-400 flex items-center justify-center">
                <FileText size={18} />
              </div>
              <div>
                <span className="text-xs font-semibold text-white block">Printable PDF Report</span>
                <span className="text-[11px] text-slate-500">Instant PDF download or print view</span>
              </div>
            </div>
            <Printer size={15} className="text-slate-500 group-hover:text-violet-400 transition-colors" />
          </button>
        </div>

        {downloading && (
          <div className="flex items-center justify-center gap-2 mt-4 text-xs text-slate-400">
            <Loader2 size={14} className="animate-spin text-violet-400" />
            Generating export payload...
          </div>
        )}

        <div className="flex justify-end mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
