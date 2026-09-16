import { useState, useEffect } from 'react'
import { Download, Smartphone, X } from 'lucide-react'

// Interface for BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPwaButton({ className = '' }: { className?: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showIOSModal, setShowIOSModal] = useState(false)

  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream

  useEffect(() => {
    // Check if already in standalone mode (already installed)
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone) {
      setIsInstalled(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handler)

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  if (isInstalled) return null

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setIsInstalled(true)
      }
      setDeferredPrompt(null)
    } else if (isIOS) {
      setShowIOSModal(true)
    } else {
      // Fallback instructions for browsers that hide beforeinstallprompt
      alert('To install Quorum:\n• On Chrome/Edge: Click the install icon in the URL address bar or select Menu (⋮) → "Install app".\n• On Mobile: Tap Menu (⋮) → "Add to Home Screen".')
    }
  }

  return (
    <>
      <button
        onClick={handleInstallClick}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 transition-all ${className}`}
        title="Download and install Quorum as an app"
      >
        <Download size={13} className="animate-bounce" />
        <span>Download App</span>
      </button>

      {/* iOS Instructions Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in" onClick={() => setShowIOSModal(false)}>
          <div className="glass-card w-full max-w-sm p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Smartphone size={18} className="text-violet-400" />
                <span>Install on iPhone / iPad</span>
              </div>
              <button onClick={() => setShowIOSModal(false)} className="text-slate-400 hover:text-white p-1">
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-4">Follow these quick steps in Safari to install Quorum to your home screen:</p>

            <ol className="space-y-3 text-xs text-slate-300">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-violet-600/30 text-violet-300 flex items-center justify-center flex-shrink-0 font-bold">1</span>
                <span>Tap the <strong>Share</strong> button at the bottom of Safari (square icon with an arrow pointing up).</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-violet-600/30 text-violet-300 flex items-center justify-center flex-shrink-0 font-bold">2</span>
                <span>Scroll down and tap <strong>Add to Home Screen</strong>.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-violet-600/30 text-violet-300 flex items-center justify-center flex-shrink-0 font-bold">3</span>
                <span>Tap <strong>Add</strong> at the top right. Quorum will appear as an app on your home screen!</span>
              </li>
            </ol>

            <button onClick={() => setShowIOSModal(false)} className="btn-primary w-full mt-5 text-xs py-2">
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  )
}
