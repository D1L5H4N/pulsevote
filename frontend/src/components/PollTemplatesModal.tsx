import { useState } from 'react'
import { X, Sparkles, BookOpen, Users, MessageSquare, Calendar, PieChart, Check, Loader2 } from 'lucide-react'
import { pollApi } from '../services/api'

interface PollTemplatesModalProps {
  isOpen: boolean
  onClose: () => void
  onPollCreated: () => void
}

interface TemplateItem {
  id: string
  title: string
  category: string
  icon: React.ReactNode
  question: string
  options: string[]
  badgeColor: string
}

const TEMPLATES: TemplateItem[] = [
  {
    id: 'classroom-quiz',
    title: 'Classroom Quiz',
    category: 'Education',
    icon: <BookOpen size={18} className="text-amber-400" />,
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    question: 'Which computer science data structure follows the LIFO (Last In, First Out) principle?',
    options: ['Stack', 'Queue', 'Binary Search Tree', 'Hash Map'],
  },
  {
    id: 'team-meeting',
    title: 'Team Meeting Priority',
    category: 'Workplace',
    icon: <Users size={18} className="text-violet-400" />,
    badgeColor: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    question: 'What should be our engineering team primary focus for the upcoming sprint?',
    options: ['Performance Optimization', 'User Experience Polish', 'Feature Development', 'Bug Triage & Technical Debt'],
  },
  {
    id: 'product-feedback',
    title: 'Product Feedback',
    category: 'Product',
    icon: <MessageSquare size={18} className="text-emerald-400" />,
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    question: 'How would you rate the new real-time voting speed and visual experience?',
    options: ['Lightning Fast & Flawless', 'Smooth and Intuitive', 'Good with Minor Suggestions', 'Needs Improvement'],
  },
  {
    id: 'event-planning',
    title: 'Event Planning',
    category: 'Community',
    icon: <Calendar size={18} className="text-sky-400" />,
    badgeColor: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    question: 'Which schedule works best for our upcoming company demo day and celebration?',
    options: ['Thursday Afternoon (3 PM UTC)', 'Friday Morning (10 AM UTC)', 'Friday Evening (6 PM UTC)', 'Next Monday'],
  },
  {
    id: 'customer-survey',
    title: 'Customer Survey',
    category: 'Research',
    icon: <PieChart size={18} className="text-rose-400" />,
    badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    question: 'Which platform feature do you find most valuable for your workflow?',
    options: ['Live WebSocket Broadcasts', 'QR Code Link Sharing', 'Visual Results Dashboard', 'PWA Offline Installation'],
  },
]

export default function PollTemplatesModal({ isOpen, onClose, onPollCreated }: PollTemplatesModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem>(TEMPLATES[0])
  const [question, setQuestion] = useState(TEMPLATES[0].question)
  const [options, setOptions] = useState<string[]>(TEMPLATES[0].options)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSelect = (tmpl: TemplateItem) => {
    setSelectedTemplate(tmpl)
    setQuestion(tmpl.question)
    setOptions([...tmpl.options])
    setError('')
  }

  const handleCreate = async () => {
    setError('')
    setIsSubmitting(true)
    try {
      await pollApi.create({
        question: question.trim(),
        options: options.map((o) => o.trim()).filter(Boolean),
      })
      onPollCreated()
      onClose()
    } catch {
      setError('Failed to launch template. Please verify all options.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">SaaS Poll Templates</h2>
              <p className="text-xs text-slate-400">One-click enterprise blueprints</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Template Selector Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 my-4">
          {TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.id}
              onClick={() => handleSelect(tmpl)}
              className={`p-2.5 rounded-xl border text-left transition-all flex flex-col items-center text-center gap-1.5 ${
                selectedTemplate.id === tmpl.id
                  ? 'bg-violet-600/20 border-violet-500 text-white shadow-lg'
                  : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-slate-800/80 flex items-center justify-center">
                {tmpl.icon}
              </div>
              <span className="text-[11px] font-semibold truncate w-full">{tmpl.title}</span>
            </button>
          ))}
        </div>

        {/* Customization Preview */}
        <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${selectedTemplate.badgeColor}`}>
              {selectedTemplate.category}
            </span>
            <span className="text-xs text-slate-500">Editable preview</span>
          </div>

          <div>
            <label className="text-xs text-slate-400 font-medium block mb-1">Poll Question</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 font-medium block mb-1">Options</label>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-4 text-[11px] text-slate-500 text-right">{i + 1}.</span>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const copy = [...options]
                      copy[i] = e.target.value
                      setOptions(copy)
                    }}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {error && <p className="text-xs text-rose-400 mt-2">{error}</p>}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isSubmitting || !question.trim()}
            className="btn-primary flex items-center gap-2 text-xs px-5 py-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Deploying...
              </>
            ) : (
              <>
                <Check size={14} />
                Deploy Template Instantly
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
