import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PlusCircle, BarChart3, CheckCircle, Clock, XCircle, ExternalLink, Trash2, StopCircle } from 'lucide-react'
import { pollApi, Poll, DashboardStats } from '../services/api'
import { useAuth } from '../context/AuthContext'

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-slate-400 text-sm font-medium">{label}</p>
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      <p className="text-4xl font-bold text-white">{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: Poll['status'] }) {
  const map = {
    active:  <span className="badge-active"><span className="live-dot" />{status}</span>,
    closed:  <span className="badge-closed">{status}</span>,
    expired: <span className="badge-expired">{status}</span>,
  }
  return map[status]
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats]   = useState<DashboardStats>({ total: 0, active: 0, closed: 0, expired: 0 })
  const [polls, setPolls]   = useState<Poll[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const [statsRes, pollsRes] = await Promise.all([pollApi.getDashboard(), pollApi.list()])
      setStats(statsRes.data)
      setPolls(pollsRes.data)
    } catch {
      /* handled silently */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleClose = async (id: string) => {
    if (!confirm('Close this poll? It will stop accepting votes.')) return
    try {
      await pollApi.close(id)
      load()
    } catch { /* ignore */ }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Permanently delete this poll and all its votes?')) return
    try {
      await pollApi.delete(id)
      load()
    } catch { /* ignore */ }
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="page-container animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Welcome back, {user?.name.split(' ')[0]}</p>
        </div>
        <Link to="/polls/create" id="create-poll-btn" className="btn-primary">
          <PlusCircle size={16} /> Create Poll
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Polls"   value={stats.total}   color="bg-violet-500/15" icon={<BarChart3 size={18} className="text-violet-400" />} />
        <StatCard label="Active"        value={stats.active}  color="bg-emerald-500/15" icon={<CheckCircle size={18} className="text-emerald-400" />} />
        <StatCard label="Closed"        value={stats.closed}  color="bg-slate-500/15"   icon={<XCircle size={18} className="text-slate-400" />} />
        <StatCard label="Expired"       value={stats.expired} color="bg-amber-500/15"   icon={<Clock size={18} className="text-amber-400" />} />
      </div>

      {/* Poll Table */}
      <div className="glass-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800">
          <h2 className="font-semibold text-white">Your Polls</h2>
        </div>

        {polls.length === 0 ? (
          <div className="text-center py-20">
            <BarChart3 size={40} className="text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400 mb-6">No polls yet. Create your first one!</p>
            <Link to="/polls/create" className="btn-primary">
              <PlusCircle size={16} /> Create Poll
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-slate-500 uppercase tracking-wide border-b border-slate-800">
                  <th className="px-6 py-3 font-medium">Question</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Created</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {polls.map((poll) => (
                  <tr key={poll.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-slate-200 font-medium text-sm line-clamp-1 max-w-xs">{poll.question}</p>
                    </td>
                    <td className="px-6 py-4"><StatusBadge status={poll.status} /></td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {new Date(poll.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/results/${poll.id}`}
                          className="p-2 rounded-lg text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 transition-all"
                          title="View results">
                          <ExternalLink size={15} />
                        </Link>
                        {poll.status === 'active' && (
                          <button onClick={() => handleClose(poll.id)}
                            className="p-2 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-all"
                            title="Close poll">
                            <StopCircle size={15} />
                          </button>
                        )}
                        <button onClick={() => handleDelete(poll.id)}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          title="Delete poll">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
