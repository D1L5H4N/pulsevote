import { useEffect, useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  PlusCircle,
  Copy,
  Share2,
  Download,
  StopCircle,
  PlayCircle,
  Trash2,
  BarChart3,
  ExternalLink,
  ChevronDown,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react'

import {
  pollApi,
  DashboardResponse,
  PollAnalyticsItem,
  PollStatus,
  ActivityFeedItem,
} from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useWebSocket } from '../hooks/useWebSocket'

import DashboardStatsCards from '../components/DashboardStatsCards'
import RecentActivityFeed from '../components/RecentActivityFeed'
import LeaderboardWidget from '../components/LeaderboardWidget'
import DeviceAndGeoAnalytics from '../components/DeviceAndGeoAnalytics'
import EngagementScoreGauge from '../components/EngagementScoreGauge'
import QuickActionsPanel from '../components/QuickActionsPanel'
import PollStatusBadge from '../components/PollStatusBadges'
import PollTemplatesModal from '../components/PollTemplatesModal'
import ExportModal from '../components/ExportModal'
import QRCodeModal from '../components/QRCodeModal'
import VotingTimelineChart from '../components/VotingTimelineChart'
import ParticipantCounter from '../components/ParticipantCounter'

type FilterStatus = 'all' | 'active' | 'closed' | 'expired'
type SortField = 'recent' | 'votes' | 'engagement' | 'views'

export default function DashboardPage() {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filters and sorting
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [sortField, setSortField] = useState<SortField>('recent')

  // Modals state
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false)
  const [exportPoll, setExportPoll] = useState<PollAnalyticsItem | null>(null)
  const [sharePoll, setSharePoll] = useState<PollAnalyticsItem | null>(null)
  const [actionNotice, setActionNotice] = useState<string | null>(null)

  const showNotification = (msg: string) => {
    setActionNotice(msg)
    setTimeout(() => setActionNotice(null), 3500)
  }

  const loadDashboard = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true)
    try {
      const res = await pollApi.getDashboard()
      setData(res.data)
    } catch {
      /* handled silently */
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  // Real-time WebSocket for live activities and dashboard sync
  const handleWsMessage = useCallback(
    (eventData: any) => {
      if (!eventData) return

      // If it's a new activity item from Redis dashboard channel
      if (eventData.type && eventData.message) {
        setData((prev) => {
          if (!prev) return prev
          const newAct: ActivityFeedItem = {
            id: eventData.id || String(Date.now()),
            user_id: eventData.user_id || '',
            poll_id: eventData.poll_id || '',
            poll_title: eventData.poll_title || '',
            type: eventData.type,
            message: eventData.message,
            created_at: eventData.created_at || new Date().toISOString(),
          }
          return {
            ...prev,
            recent_activities: [newAct, ...(prev.recent_activities || []).slice(0, 20)],
          }
        })
        // Refresh full dataset in background for updated metrics
        loadDashboard(true)
      }
    },
    [loadDashboard]
  )

  useWebSocket({
    endpoint: '/ws/dashboard',
    onMessage: handleWsMessage,
    enabled: true,
  })

  // Duplicate poll action
  const handleDuplicate = async (pollId: string) => {
    try {
      await pollApi.duplicate(pollId)
      showNotification('Poll cloned successfully as active copy')
      loadDashboard(true)
    } catch {
      alert('Failed to duplicate poll')
    }
  }

  // Toggle close / reopen
  const handleToggleStatus = async (poll: PollAnalyticsItem) => {
    try {
      if (poll.status === 'active') {
        if (!confirm(`Close poll "${poll.question}"? It will stop accepting votes.`)) return
        await pollApi.close(poll.id)
        showNotification('Poll closed')
      } else {
        await pollApi.open(poll.id, null)
        showNotification('Poll reopened as active')
      }
      loadDashboard(true)
    } catch {
      alert('Failed to update poll status')
    }
  }

  // Delete poll action
  const handleDelete = async (pollId: string) => {
    if (!confirm('Permanently delete this poll and all its analytics?')) return
    try {
      await pollApi.delete(pollId)
      showNotification('Poll deleted')
      loadDashboard(true)
    } catch {
      alert('Failed to delete poll')
    }
  }

  // Filter and sort polls
  const filteredPolls = useMemo(() => {
    if (!data || !data.polls) return []

    return data.polls
      .filter((p) => {
        const matchesQuery = p.question.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesStatus =
          statusFilter === 'all'
            ? true
            : p.status === statusFilter
        return matchesQuery && matchesStatus
      })
      .sort((a, b) => {
        if (sortField === 'votes') return b.votes - a.votes
        if (sortField === 'engagement') return b.engagement_score - a.engagement_score
        if (sortField === 'views') return b.views - a.views
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
  }, [data, searchQuery, statusFilter, sortField])

  if (loading || !data) {
    return (
      <div className="page-container space-y-6">
        <div className="skeleton h-12 w-1/3 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="skeleton h-64 rounded-xl lg:col-span-2" />
          <div className="skeleton h-64 rounded-xl" />
        </div>
      </div>
    )
  }

  const latestActive = data.polls.find((p) => p.status === 'active')

  return (
    <div className="page-container animate-fade-in space-y-6 pb-16">
      {/* Toast notification banner */}
      {actionNotice && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 bg-violet-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-2xl animate-fade-in">
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              SaaS Dashboard
            </h1>
            <button
              onClick={() => loadDashboard()}
              disabled={refreshing}
              className="text-slate-500 hover:text-white p-1 rounded transition-colors"
              title="Refresh telemetry"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin text-violet-400' : ''} />
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Welcome back, {user?.name.split(' ')[0]} • Real-time telemetry and engagement overview
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {data.live_viewers > 0 && (
            <ParticipantCounter
              viewers={data.live_viewers}
              voted={data.stats.total_votes}
              observing={Math.max(0, data.live_viewers - data.stats.total_votes)}
            />
          )}
          <QuickActionsPanel
            onOpenTemplates={() => setIsTemplatesOpen(true)}
            onQuickShare={latestActive ? () => setSharePoll(latestActive) : undefined}
            onQuickDuplicate={data.polls[0] ? () => handleDuplicate(data.polls[0].id) : undefined}
            onQuickClose={latestActive ? () => handleToggleStatus(latestActive) : undefined}
            hasActivePolls={(data.stats.active_polls ?? data.stats.active) > 0}
          />
        </div>
      </div>

      {/* 1. Dashboard Statistics Cards */}
      <DashboardStatsCards stats={data.stats} liveViewers={data.live_viewers} />

      {/* 2. Primary Analytics Grid (Leaderboard + Timeline + Engagement Gauge) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Popular polls leaderboard */}
        <div className="lg:col-span-1">
          <LeaderboardWidget polls={data.popular_polls || data.polls} />
        </div>

        {/* Voting velocity chart */}
        <div className="lg:col-span-1">
          {latestActive ? (
            <VotingTimelineChart pollId={latestActive.id} />
          ) : (
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-sm flex flex-col justify-center items-center text-center h-full min-h-[300px]">
              <BarChart3 size={32} className="text-slate-600 mb-2" />
              <h4 className="text-sm font-semibold text-white">No Active Polling Stream</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Launch a poll to stream real-time voting velocity curves and minute-by-minute activity.
              </p>
              <button
                onClick={() => setIsTemplatesOpen(true)}
                className="btn-primary text-xs mt-4 py-1.5 px-3"
              >
                Launch from Template
              </button>
            </div>
          )}
        </div>

        {/* Overall Engagement Score */}
        <div className="lg:col-span-1">
          <EngagementScoreGauge
            score={data.stats.avg_engagement || 0}
            totalVotes={data.stats.total_votes || 0}
            totalViews={data.stats.total_views || 0}
          />
        </div>
      </div>

      {/* 3. Deep Telemetry: Device Analytics, Geography, and Real-Time Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <DeviceAndGeoAnalytics devices={data.devices} geography={data.geography} />
        </div>
        <div className="lg:col-span-1">
          <RecentActivityFeed activities={data.recent_activities || []} />
        </div>
      </div>

      {/* 4. Poll Management & Performance Table */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 overflow-hidden backdrop-blur-sm">
        {/* Table Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white">Poll Performance & Lifecycle</h2>
            <p className="text-xs text-slate-500">
              Showing {filteredPolls.length} of {data.polls.length} total polls
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search input */}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search polls..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-950/80 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 w-44 sm:w-52"
              />
            </div>

            {/* Status pills */}
            <div className="flex items-center bg-slate-950/80 p-0.5 rounded-lg border border-slate-800 text-xs">
              {(['all', 'active', 'closed', 'expired'] as FilterStatus[]).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2 py-1 rounded capitalize transition-all text-[11px] font-medium ${
                    statusFilter === st
                      ? 'bg-violet-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-violet-500 appearance-none pr-7 cursor-pointer"
              >
                <option value="recent">Most Recent</option>
                <option value="votes">Most Votes</option>
                <option value="engagement">Highest Engagement</option>
                <option value="views">Most Views</option>
              </select>
              <ChevronDown
                size={12}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* Table Content */}
        {filteredPolls.length === 0 ? (
          <div className="text-center py-16">
            <BarChart3 size={36} className="text-slate-700 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-300">No polls matched your search</p>
            <p className="text-xs text-slate-500 mt-1">Try modifying your filter or create a new poll.</p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => {
                  setSearchQuery('')
                  setStatusFilter('all')
                }}
                className="text-xs text-violet-400 hover:underline"
              >
                Reset filters
              </button>
              <span className="text-slate-600">•</span>
              <button
                onClick={() => setIsTemplatesOpen(true)}
                className="text-xs text-violet-400 hover:underline"
              >
                Launch template
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 uppercase font-semibold tracking-wider border-b border-slate-800 bg-slate-950/30">
                  <th className="px-5 py-3">Question</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Votes</th>
                  <th className="px-4 py-3 text-right">Views</th>
                  <th className="px-4 py-3 text-right">Participation</th>
                  <th className="px-4 py-3 text-right">Engagement</th>
                  <th className="px-5 py-3 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredPolls.map((poll) => (
                  <tr
                    key={poll.id}
                    className="hover:bg-slate-800/30 transition-colors group"
                  >
                    {/* Title & metadata */}
                    <td className="px-5 py-3.5 max-w-xs">
                      <Link
                        to={`/polls/${poll.id}/detail`}
                        className="font-medium text-white hover:text-violet-300 transition-colors truncate block"
                      >
                        {poll.question}
                      </Link>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>{poll.options.length} options</span>
                        <span>•</span>
                        <span>{new Date(poll.created_at).toLocaleDateString()}</span>
                      </div>
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-3.5">
                      <PollStatusBadge status={poll.status} size="sm" />
                    </td>

                    {/* Votes count */}
                    <td className="px-4 py-3.5 text-right font-mono font-semibold text-white">
                      {poll.votes.toLocaleString()}
                    </td>

                    {/* Views count */}
                    <td className="px-4 py-3.5 text-right font-mono text-slate-400">
                      {poll.views.toLocaleString()}
                    </td>

                    {/* Participation Rate % */}
                    <td className="px-4 py-3.5 text-right">
                      <span className="font-mono font-medium text-slate-300">
                        {poll.participation_rate}%
                      </span>
                    </td>

                    {/* Engagement score */}
                    <td className="px-4 py-3.5 text-right">
                      <span
                        className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded ${
                          poll.engagement_score >= 70
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : poll.engagement_score >= 40
                            ? 'bg-violet-500/10 text-violet-400'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {poll.engagement_score}/100
                      </span>
                    </td>

                    {/* Action buttons */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Duplicate */}
                        <button
                          onClick={() => handleDuplicate(poll.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          title="Clone / Duplicate poll"
                        >
                          <Copy size={13} />
                        </button>

                        {/* Share */}
                        <button
                          onClick={() => setSharePoll(poll)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          title="Share Link & QR"
                        >
                          <Share2 size={13} />
                        </button>

                        {/* Export */}
                        <button
                          onClick={() => setExportPoll(poll)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          title="Export CSV / Excel / PDF"
                        >
                          <Download size={13} />
                        </button>

                        {/* Close / Reopen */}
                        <button
                          onClick={() => handleToggleStatus(poll)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          title={poll.status === 'active' ? 'Close poll' : 'Reopen poll'}
                        >
                          {poll.status === 'active' ? (
                            <StopCircle size={13} className="text-amber-400" />
                          ) : (
                            <PlayCircle size={13} className="text-emerald-400" />
                          )}
                        </button>

                        {/* View Results Link */}
                        <Link
                          to={`/results/${poll.id}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-violet-400 hover:bg-slate-800 transition-colors"
                          title="View Live Results"
                        >
                          <ExternalLink size={13} />
                        </Link>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(poll.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                          title="Delete poll"
                        >
                          <Trash2 size={13} />
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

      {/* Templates Modal */}
      <PollTemplatesModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        onPollCreated={() => {
          showNotification('Poll launched from blueprint template!')
          loadDashboard(true)
        }}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={!!exportPoll}
        onClose={() => setExportPoll(null)}
        poll={exportPoll}
      />

      {/* Share / QR Modal */}
      {sharePoll && (
        <QRCodeModal
          onClose={() => setSharePoll(null)}
          pollId={sharePoll.id}
          question={sharePoll.question}
        />
      )}
    </div>
  )
}
