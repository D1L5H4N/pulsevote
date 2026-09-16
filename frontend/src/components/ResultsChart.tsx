import { ResultsResponse, OptionResult } from '../services/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList
} from 'recharts'

const BAR_COLORS = ['#7c3aed', '#a855f7', '#8b5cf6', '#6d28d9', '#9333ea', '#c026d3']

interface Props {
  results: ResultsResponse
}

interface ChartDatum {
  name: string
  fullName: string
  votes: number
  percentage: number
}

// Custom tooltip for the Recharts bar chart
function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: ChartDatum }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 shadow-xl">
      <p className="text-white text-sm font-medium mb-1">{d.fullName}</p>
      <p className="text-violet-400 text-sm">{d.votes.toLocaleString()} votes</p>
      <p className="text-slate-400 text-xs">{d.percentage.toFixed(1)}% of total</p>
    </div>
  )
}

/**
 * ResultsChart renders the Recharts animated bar chart for vote distribution.
 * Extracted from ResultsPage to keep chart concerns separate and allow
 * reuse on any page that shows results.
 */
export default function ResultsChart({ results }: Props) {
  if (results.total_votes === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-sm">
        <p>No votes yet — chart will appear when votes arrive.</p>
      </div>
    )
  }

  const chartData: ChartDatum[] = results.results.map((r: OptionResult) => ({
    name: r.option.length > 18 ? r.option.slice(0, 18) + '…' : r.option,
    fullName: r.option,
    votes: r.votes,
    percentage: r.percentage,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 20, right: 16, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(124,58,237,0.08)' }} />
        <Bar dataKey="votes" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={700}>
          <LabelList
            dataKey="percentage"
            position="top"
            formatter={(v: number) => `${v.toFixed(1)}%`}
            style={{ fill: '#94a3b8', fontSize: 11 }}
          />
          {chartData.map((_, index) => (
            <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
