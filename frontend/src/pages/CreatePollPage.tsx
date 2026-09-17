import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlusCircle, Trash2, Clock, AlertCircle, CheckCircle2 } from 'lucide-react'
import { pollApi } from '../services/api'

const MAX_OPTIONS = 6
const MIN_OPTIONS = 2

export default function CreatePollPage() {
  const navigate = useNavigate()
  const [question, setQuestion]   = useState('')
  const [options, setOptions]     = useState(['', ''])
  const [expiresAt, setExpiresAt] = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)

  const addOption = () => {
    if (options.length < MAX_OPTIONS) setOptions([...options, ''])
  }

  const removeOption = (i: number) => {
    if (options.length <= MIN_OPTIONS) return
    setOptions(options.filter((_, idx) => idx !== i))
  }

  const updateOption = (i: number, val: string) => {
    const updated = [...options]
    updated[i] = val
    setOptions(updated)
  }

  const validate = (): string | null => {
    if (question.trim().length < 5) return 'Question must be at least 5 characters.'
    const filled = options.map((o) => o.trim()).filter(Boolean)
    if (filled.length < MIN_OPTIONS) return `Please fill in at least ${MIN_OPTIONS} options.`
    const unique = new Set(filled.map((o) => o.toLowerCase()))
    if (unique.size !== filled.length) return 'Options must be unique (case-insensitive).'
    if (expiresAt) {
      const expDate = new Date(expiresAt)
      if (isNaN(expDate.getTime()) || expDate <= new Date()) return 'Expiry must be a future date/time.'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationError = validate()
    if (validationError) { setError(validationError); return }

    setError('')
    setLoading(true)
    try {
      const payload = {
        question: question.trim(),
        options: options.map((o) => o.trim()).filter(Boolean),
        ...(expiresAt ? { expires_at: new Date(expiresAt).toISOString() } : {}),
      }
      const { data } = await pollApi.create(payload)
      navigate(`/polls/${data.id}/share`)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg || 'Failed to create poll. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const filledOptions = options.filter((o) => o.trim()).length

  return (
    <div className="page-container max-w-2xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Create a New Poll</h1>
        <p className="text-slate-400 text-sm mt-1">Fill in your question and options, then share the link with your audience.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle size={16} className="flex-shrink-0" /> {error}
          </div>
        )}

        {/* Question */}
        <div className="glass-card p-6">
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Poll Question <span className="text-red-400">*</span>
          </label>
          <textarea
            id="poll-question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. What is your preferred meeting time?"
            required
            minLength={5}
            maxLength={500}
            rows={3}
            className="input resize-none"
          />
          <p className="text-xs text-slate-600 mt-2 text-right">{question.length}/500</p>
        </div>

        {/* Options */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <label className="text-sm font-medium text-slate-300">
              Options <span className="text-slate-500">({filledOptions}/{MAX_OPTIONS})</span>
            </label>
            <span className="text-xs text-slate-500">{MIN_OPTIONS} to {MAX_OPTIONS} options</span>
          </div>

          <div className="space-y-3">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-3 group">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-xs text-violet-400 font-semibold">
                  {String.fromCharCode(65 + i)}
                </div>
                <input
                  id={`option-${i}`}
                  type="text"
                  value={opt}
                  onChange={(e) => updateOption(i, e.target.value)}
                  placeholder={`Option ${String.fromCharCode(65 + i)}`}
                  maxLength={200}
                  className="input flex-1"
                />
                {options.length > MIN_OPTIONS && (
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    className="flex-shrink-0 p-2 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                    title="Remove option"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {options.length < MAX_OPTIONS && (
            <button
              type="button"
              onClick={addOption}
              className="mt-4 flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 transition-colors"
            >
              <PlusCircle size={16} /> Add another option
            </button>
          )}
        </div>

        {/* Expiry (optional) */}
        <div className="glass-card p-6">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-3">
            <Clock size={15} className="text-slate-500" />
            Poll Expiry <span className="text-slate-500 font-normal">(optional)</span>
          </label>
          <input
            id="poll-expiry"
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
            className="input"
          />
          <p className="text-xs text-slate-500 mt-2">Leave empty for no expiry. The poll will close automatically at the specified time.</p>
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            id="create-poll-submit"
            type="submit"
            disabled={loading}
            className="btn-primary flex-1"
          >
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating...</>
            ) : (
              <><CheckCircle2 size={16} /> Create Poll</>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
