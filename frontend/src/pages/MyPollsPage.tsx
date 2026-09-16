import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PlusCircle, LayoutGrid, LayoutList, Search } from 'lucide-react'
import { pollApi, Poll } from '../services/api'
import PollCard from '../components/PollCard'

type Filter = 'all' | 'active' | 'closed' | 'expired'

export default function MyPollsPage() {
  const [polls, setPolls]     = useState<Poll[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState<Filter>('all')
  const [search, setSearch]   = useState('')
  const [view, setView]       = useState<'grid' | 'list'>('grid')

  const load = async () => {
    try {
      const { data } = await pollApi.list()
      setPolls(data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = polls.filter((p) => {
    const matchesFilter = filter === 'all' || p.status === filter
    const matchesSearch = p.question.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const counts = {
    all:     polls.length,
    active:  polls.filter((p) => p.status === 'active').length,
    closed:  polls.filter((p) => p.status === 'closed').length,
    expired: polls.filter((p) => p.status === 'expired').length,
  }

  const filterBtns: { label: string; value: Filter }[] = [
    { label: `All (${counts.all})`,         value: 'all' },
    { label: `Active (${counts.active})`,   value: 'active' },
    { label: `Closed (${counts.closed})`,   value: 'closed' },
    { label: `Expired (${counts.expired})`, value: 'expired' },
  ]

  return (
    <div className="page-container animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">My Polls</h1>
          <p className="text-slate-400 text-sm mt-1">{polls.length} poll{polls.length !== 1 ? 's' : ''} created</p>
        </div>
        <Link to="/polls/create" className="btn-primary">
          <PlusCircle size={16} /> Create Poll
        </Link>
      </div>

      {/* Filters + Search + View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Status filter tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 flex-wrap">
          {filterBtns.map((btn) => (
            <button
              key={btn.value}
              onClick={() => setFilter(btn.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === btn.value
                  ? 'bg-violet-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search polls…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 h-full"
          />
        </div>

        {/* View toggle */}
        <div className="flex gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
          <button onClick={() => setView('grid')}
            className={`p-2 rounded-lg transition-all ${view === 'grid' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-white'}`}>
            <LayoutGrid size={16} />
          </button>
          <button onClick={() => setView('list')}
            className={`p-2 rounded-lg transition-all ${view === 'list' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-white'}`}>
            <LayoutList size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className={`grid gap-4 ${view === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-52 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <PlusCircle size={40} className="text-slate-700 mx-auto mb-4" />
          <p className="text-slate-400 mb-6">
            {search ? `No polls matching "${search}"` : 'No polls in this category'}
          </p>
          {!search && (
            <Link to="/polls/create" className="btn-primary">
              <PlusCircle size={16} /> Create your first poll
            </Link>
          )}
        </div>
      ) : (
        <div className={`grid gap-4 ${view === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 max-w-2xl'}`}>
          {filtered.map((poll) => (
            <PollCard key={poll.id} poll={poll} onRefresh={load} />
          ))}
        </div>
      )}
    </div>
  )
}
