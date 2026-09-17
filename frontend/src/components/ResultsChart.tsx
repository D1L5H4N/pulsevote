import { useState } from 'react'
import { ResultsResponse, OptionResult } from '../services/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
  PieChart, Pie, Sector, Legend
} from 'recharts'
import { BarChart3, PieChart as PieIcon, Trophy, Award, TrendingUp, Sparkles } from 'lucide-react'

// Curated high-contrast gradients for poll options
export const OPTION_PALETTES = [
  { start: '#8b5cf6', end: '#6366f1', solid: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)', text: 'text-violet-400', border: 'border-violet-500/30' },
  { start: '#06b6d4', end: '#3b82f6', solid: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  { start: '#10b981', end: '#059669', solid: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  { start: '#f59e0b', end: '#ea580c', solid: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', text: 'text-amber-400', border: 'border-amber-500/30' },
  { start: '#f43f5e', end: '#e11d48', solid: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)', text: 'text-rose-400', border: 'border-rose-500/30' },
  { start: '#a855f7', end: '#d946ef', solid: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)', text: 'text-fuchsia-400', border: 'border-fuchsia-500/30' },
  { start: '#3b82f6', end: '#1d4ed8', solid: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', text: 'text-blue-400', border: 'border-blue-500/30' },
  { start: '#14b8a6', end: '#0f766e', solid: '#14b8a6', bg: 'rgba(20, 184, 166, 0.15)', text: 'text-teal-400', border: 'border-teal-500/30' },
]

export function getOptionPalette(index: number) {
  return OPTION_PALETTES[index % OPTION_PALETTES.length]
}

interface Props {
  results: ResultsResponse
  showLeadBanner?: boolean
  showDetailedBreakdown?: boolean
}

interface ChartDatum {
  name: string
  fullName: string
  votes: number
  percentage: number
  index: number
}

// Active shape renderer for Donut Chart on hover
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderActiveShape(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value } = props

  return (
    <g>
      <text x={cx} y={cy - 12} textAnchor="middle" fill="#94a3b8" fontSize={11} fontWeight={500}>
        {payload.name}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="#ffffff" fontSize={18} fontWeight={700}>
        {payload.percentage.toFixed(1)}%
      </text>
      <text x={cx} y={cy + 32} textAnchor="middle" fill="#64748b" fontSize={11}>
        {value.toLocaleString()} votes
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{ filter: 'drop-shadow(0px 4px 12px rgba(124, 58, 237, 0.4))' }}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 10}
        outerRadius={outerRadius + 12}
        fill={fill}
      />
    </g>
  )
}

// Custom Glassmorphism Tooltip for Bar Chart
function CustomBarTooltip({ active, payload }: { active?: boolean; payload?: { payload: ChartDatum }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const palette = getOptionPalette(d.index)

  return (
    <div className="bg-slate-900/95 border border-slate-700/80 backdrop-blur-md rounded-xl p-3.5 shadow-2xl min-w-[180px]">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: palette.solid }} />
        <p className="text-white text-sm font-semibold truncate max-w-[200px]">{d.fullName}</p>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Votes:</span>
          <span className="text-white font-medium">{d.votes.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Share:</span>
          <span className="font-bold" style={{ color: palette.solid }}>{d.percentage.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  )
}

export default function ResultsChart({ results, showLeadBanner = true, showDetailedBreakdown = false }: Props) {
  const [chartType, setChartType] = useState<'bar' | 'donut' | 'horizontal'>('bar')
  const [activeIndex, setActiveIndex] = useState(0)

  if (!results || results.total_votes === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4 text-violet-400 animate-pulse">
          <BarChart3 size={32} />
        </div>
        <h3 className="text-white font-medium text-base mb-1">Awaiting First Vote</h3>
        <p className="text-slate-400 text-sm max-w-sm">
          The vote distribution chart and live analytics will render automatically once the first response is recorded.
        </p>
      </div>
    )
  }

  const sortedResults = [...results.results].sort((a, b) => b.votes - a.votes)
  const maxVotes = sortedResults[0]?.votes || 0
  const leader = sortedResults[0]
  const runnerUp = sortedResults[1]
  const leadMargin = runnerUp ? leader.votes - runnerUp.votes : leader.votes
  const isTie = sortedResults.length > 1 && sortedResults[0].votes === sortedResults[1].votes && sortedResults[0].votes > 0

  const chartData: ChartDatum[] = results.results.map((r: OptionResult, idx: number) => ({
    name: r.option.length > 16 ? r.option.slice(0, 15) + '…' : r.option,
    fullName: r.option,
    votes: r.votes,
    percentage: r.percentage,
    index: idx,
  }))

  return (
    <div className="space-y-6">
      {/* ===== Leading Spotlight Banner ===== */}
      {showLeadBanner && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-950/50 via-slate-900/90 to-purple-950/40 border border-violet-500/30 p-4 sm:p-5 backdrop-blur-md shadow-xl">
          <div className="absolute -right-12 -top-12 w-40 h-40 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 p-0.5 flex-shrink-0 shadow-lg shadow-amber-500/20 flex items-center justify-center">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Trophy size={20} className="text-amber-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                    <Sparkles size={12} /> {isTie ? 'Tied for Lead' : 'Current Leader'}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 font-medium">
                    {leader.percentage.toFixed(1)}% Share
                  </span>
                </div>
                <h4 className="text-base sm:text-lg font-bold text-white mt-0.5 tracking-tight">
                  {leader.option}
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  <span className="text-slate-200 font-medium">{leader.votes.toLocaleString()}</span> votes cast
                  {!isTie && runnerUp && runnerUp.votes > 0 && (
                    <> • <span className="text-emerald-400 font-medium">+{leadMargin} ahead</span> of next option</>
                  )}
                </p>
              </div>
            </div>

            {/* Quick mini-stat pill */}
            <div className="flex items-center gap-3 bg-slate-800/60 border border-slate-700/60 px-4 py-2.5 rounded-xl self-start sm:self-auto">
              <div className="text-right">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Total Turnout</p>
                <p className="text-sm font-bold text-white">{results.total_votes.toLocaleString()} votes</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400">
                <TrendingUp size={16} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Chart Controls Header ===== */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Graphic Distribution
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
            {results.results.length} Choices
          </span>
        </div>

        {/* View Switcher: Vertical Bar, Donut, Horizontal Bar */}
        <div className="inline-flex rounded-xl bg-slate-800/80 p-1 border border-slate-700/60">
          <button
            type="button"
            onClick={() => setChartType('bar')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              chartType === 'bar'
                ? 'bg-violet-600 text-white shadow-md shadow-violet-900/40'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Vertical Bar Chart"
          >
            <BarChart3 size={13} />
            <span className="hidden sm:inline">Columns</span>
          </button>

          <button
            type="button"
            onClick={() => setChartType('horizontal')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              chartType === 'horizontal'
                ? 'bg-violet-600 text-white shadow-md shadow-violet-900/40'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Horizontal Bar Chart"
          >
            <span className="font-mono text-xs leading-none">═</span>
            <span className="hidden sm:inline">Bars</span>
          </button>

          <button
            type="button"
            onClick={() => setChartType('donut')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              chartType === 'donut'
                ? 'bg-violet-600 text-white shadow-md shadow-violet-900/40'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Donut Chart"
          >
            <PieIcon size={13} />
            <span className="hidden sm:inline">Donut</span>
          </button>
        </div>
      </div>

      {/* ===== Interactive Chart Area ===== */}
      <div className="relative min-h-[300px] flex items-center justify-center">
        {chartType === 'bar' && (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 25, right: 16, left: -15, bottom: 10 }}>
              <defs>
                {chartData.map((_, i) => {
                  const palette = getOptionPalette(i)
                  return (
                    <linearGradient key={`bar-grad-${i}`} id={`bar-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={palette.start} stopOpacity={1} />
                      <stop offset="100%" stopColor={palette.end} stopOpacity={0.7} />
                    </linearGradient>
                  )
                })}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={{ stroke: '#334155' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(124,58,237,0.06)' }} />
              <Bar
                dataKey="votes"
                radius={[8, 8, 0, 0]}
                isAnimationActive
                animationDuration={800}
                animationEasing="ease-out"
              >
                <LabelList
                  dataKey="percentage"
                  position="top"
                  formatter={(v: number) => `${v.toFixed(1)}%`}
                  style={{ fill: '#e2e8f0', fontSize: 11, fontWeight: 600 }}
                />
                {chartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={`url(#bar-grad-${index})`}
                    stroke={getOptionPalette(index).solid}
                    strokeWidth={1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {chartType === 'horizontal' && (
          <ResponsiveContainer width="100%" height={Math.max(260, chartData.length * 52)}>
            <BarChart
              layout="vertical"
              data={chartData}
              margin={{ top: 10, right: 40, left: 30, bottom: 10 }}
            >
              <defs>
                {chartData.map((_, i) => {
                  const palette = getOptionPalette(i)
                  return (
                    <linearGradient key={`hbar-grad-${i}`} id={`hbar-grad-${i}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={palette.end} stopOpacity={0.8} />
                      <stop offset="100%" stopColor={palette.start} stopOpacity={1} />
                    </linearGradient>
                  )
                })}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={90}
              />
              <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(124,58,237,0.06)' }} />
              <Bar
                dataKey="votes"
                radius={[0, 8, 8, 0]}
                isAnimationActive
                animationDuration={800}
                animationEasing="ease-out"
              >
                <LabelList
                  dataKey="percentage"
                  position="right"
                  formatter={(v: number) => `${v.toFixed(1)}%`}
                  style={{ fill: '#e2e8f0', fontSize: 11, fontWeight: 600 }}
                />
                {chartData.map((_, index) => (
                  <Cell
                    key={`hcell-${index}`}
                    fill={`url(#hbar-grad-${index})`}
                    stroke={getOptionPalette(index).solid}
                    strokeWidth={1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {chartType === 'donut' && (
          <div className="w-full flex flex-col items-center">
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <defs>
                  {chartData.map((_, i) => {
                    const palette = getOptionPalette(i)
                    return (
                      <linearGradient key={`pie-grad-${i}`} id={`pie-grad-${i}`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={palette.start} stopOpacity={1} />
                        <stop offset="100%" stopColor={palette.end} stopOpacity={0.85} />
                      </linearGradient>
                    )
                  })}
                </defs>
                <Pie
                  activeIndex={activeIndex}
                  activeShape={renderActiveShape}
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={105}
                  dataKey="votes"
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  isAnimationActive
                  animationDuration={800}
                >
                  {chartData.map((_, index) => (
                    <Cell
                      key={`pie-cell-${index}`}
                      fill={`url(#pie-grad-${index})`}
                      stroke="#0f172a"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any, entry: any) => {
                    const d = chartData.find(c => c.name === value || c.fullName === value)
                    return (
                      <span className="text-xs text-slate-300 font-medium px-1">
                        {d ? `${d.fullName} (${d.percentage.toFixed(0)}%)` : entry.value}
                      </span>
                    )
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <p className="text-[11px] text-slate-500 mt-1">Hover or tap any sector to view option metrics</p>
          </div>
        )}
      </div>

      {/* ===== Optional Detailed Breakdown with Ranks and Gradient Glow ===== */}
      {showDetailedBreakdown && (
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Ranked Option Breakdown
          </h4>
          <div className="grid grid-cols-1 gap-3">
            {sortedResults.map((r, rankIdx) => {
              const originalIdx = results.results.findIndex(x => x.option === r.option)
              const palette = getOptionPalette(originalIdx >= 0 ? originalIdx : rankIdx)
              const isWinner = r.votes === maxVotes && r.votes > 0

              return (
                <div
                  key={rankIdx}
                  className={`p-3.5 rounded-xl border transition-all duration-300 ${
                    isWinner
                      ? 'bg-slate-800/70 border-violet-500/40 shadow-lg shadow-violet-950/30'
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-700/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Rank Medal */}
                      <span
                        className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center flex-shrink-0 ${
                          rankIdx === 0
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            : rankIdx === 1
                            ? 'bg-slate-400/20 text-slate-300 border border-slate-400/30'
                            : rankIdx === 2
                            ? 'bg-amber-700/20 text-amber-600 border border-amber-700/30'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {rankIdx === 0 ? <Award size={13} /> : `#${rankIdx + 1}`}
                      </span>

                      <span className="text-white text-sm font-medium truncate">
                        {r.option}
                      </span>

                      {isWinner && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 flex items-center gap-1">
                          <Trophy size={10} className="text-amber-400" /> Leading
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs text-slate-400">
                        <span className="font-semibold text-slate-200">{r.votes.toLocaleString()}</span> votes
                      </span>
                      <span
                        className="text-xs font-bold px-2.5 py-1 rounded-lg border"
                        style={{
                          backgroundColor: palette.bg,
                          color: palette.solid,
                          borderColor: palette.solid + '40',
                        }}
                      >
                        {r.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Progress bar matching chart gradient */}
                  <div className="h-2.5 bg-slate-800/90 rounded-full overflow-hidden p-0.5 border border-slate-700/40">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${Math.max(r.percentage, 0.5)}%`,
                        background: `linear-gradient(90deg, ${palette.start}, ${palette.end})`,
                        boxShadow: isWinner ? `0 0 10px ${palette.start}66` : 'none',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
